"""Simple Chinese lexical retrieval for the first MVP."""
import re
import http.client
import ipaddress
import socket
import ssl
import time
import hashlib
import threading
import unicodedata
from collections import OrderedDict
from datetime import datetime, timezone
from urllib.parse import urlsplit, urljoin, urlunsplit


def words(text: str) -> list[str]:
    import jieba
    text = unicodedata.normalize('NFKC', text)
    return [s.lower() for s in jieba.cut(text) if re.search(r"[\u4e00-\u9fffa-zA-Z0-9]", s)]


_INDEX_CACHE = OrderedDict()
_INDEX_LOCK = threading.RLock()
_MAX_INDEXES = 2


def _corpus_index(chunks):
    """Cache only lexical indexes, never source records or citation text.

    Hash the ordered effective text, so a reload with new dict identities can
    reuse its index while additions, reordering and projection edits invalidate
    it. At most two indexes survive across Streamlit sessions.
    """
    from rank_bm25 import BM25Okapi
    corpus = [unicodedata.normalize('NFKC', chunk.get('search_text') or chunk['text']) for chunk in chunks]
    digest = hashlib.sha256()
    for text in corpus:
        encoded = text.encode('utf-8')
        digest.update(len(encoded).to_bytes(8, 'big'))
        digest.update(encoded)
    key = digest.digest()
    with _INDEX_LOCK:
        if key in _INDEX_CACHE:
            _INDEX_CACHE.move_to_end(key)
            return _INDEX_CACHE[key]
        while len(_INDEX_CACHE) >= _MAX_INDEXES:
            _INDEX_CACHE.popitem(last=False)
        index = BM25Okapi([words(text) or ['空'] for text in corpus])
        _INDEX_CACHE[key] = index
        return index


# 每次工具调用都是新进程，索引缓存无法跨调用复用；语料很大时先做一次
# 纯子串预筛（不调用分词器），再在小候选集上建 BM25，避免冷启动几十秒。
MAX_EXACT_CORPUS = 2000
PREFILTER_MIN = 200


def _prefilter(terms, chunks, limit=None):
    """Cheap conservative candidate selection; never discard a lexical hit.

    ASCII word boundaries prevent concatenate from outranking the word cat.
    Chinese substrings are only a superset; BM25 subsequently verifies their
    actual token membership. No arbitrary top-N cut can erase the true hit.
    """
    scored = []
    patterns = {term: re.compile(r'(?<![a-z0-9_])' + re.escape(term) + r'(?![a-z0-9_])')
                for term in terms if re.fullmatch(r'[a-z0-9_]+(?:\.[0-9]+)?', term)}
    for chunk in chunks:
        text = unicodedata.normalize('NFKC', chunk.get('search_text') or chunk['text']).lower()
        hits = 0
        weight = 0
        for term in terms:
            count = len(patterns[term].findall(text)) if term in patterns else text.count(term)
            if count:
                hits += 1
                weight += 5 if count > 5 else count
        if hits:
            scored.append((hits, weight, chunk))
    if not scored:
        return []
    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [chunk for _, _, chunk in scored]


def _bm25_rank(terms, chunks, k):
    index = _corpus_index(chunks)
    matches = [i for i, frequencies in enumerate(index.doc_freqs) if any(term in frequencies for term in terms)]
    if not matches:
        return []
    scores = index.get_scores(terms)
    top = sorted(matches, key=lambda idx: float(scores[idx]), reverse=True)[:k]
    return [chunks[idx] for idx in top]


def retrieve(query: str, chunks: list[dict], k: int = 6) -> list[dict]:
    if not query.strip() or not chunks or k <= 0:
        return []
    stop = {"的", "了", "和", "与", "在", "是", "以及", "一个", "如何", "什么", "怎么", "为什么", "材料", "题目"}
    terms = [w for w in words(query) if w not in stop]
    if not terms:
        return []
    if len(chunks) > MAX_EXACT_CORPUS:
        candidates = _prefilter(terms, chunks, max(PREFILTER_MIN, k * 40))
        if not candidates:
            return []
        return _bm25_rank(terms, candidates, k)
    return _bm25_rank(terms, chunks, k)


MAX_WEB_BYTES = 3 * 1024 * 1024
FETCH_TIMEOUT = 12
FETCH_TOTAL_SECONDS = 30
MAX_REDIRECTS = 4


def _public_url_syntax(url: str):
    """Validate a display-only search link without contacting its destination.

    DNS checks belong to fetch: a snippet can survive Fake-IP DNS because it is
    supplied by the search provider, not downloaded from the target address.
    """
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("只允许http(s)网页地址")
    if parsed.username or parsed.password or any(ord(c) < 32 for c in url):
        raise ValueError("网页地址不能包含凭据或控制字符")
    host = parsed.hostname.encode("idna").decode("ascii")
    if '\\' in host or '%' in host or not host or host.lower().rstrip('.').endswith(('.localhost', '.local', '.internal')) or host.lower().rstrip('.') == 'localhost':
        raise ValueError("禁止本地或无效网页地址")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        if '.' not in host:
            raise ValueError("禁止本地或无效网页地址")
    else:
        mapped = getattr(address, 'ipv4_mapped', None)
        if (not address.is_global or address.is_multicast or address.is_reserved
                or (mapped and (not mapped.is_global or mapped.is_multicast or mapped.is_reserved))):
            raise ValueError("禁止访问本机、私网或其他非公网地址")
    # Accessing .port also validates malformed/out-of-range explicit ports.
    _ = parsed.port
    return parsed, host


def _public_target(url: str) -> tuple[object, str, list]:
    """Resolve once and pin the checked address when opening the connection."""
    parsed, host = _public_url_syntax(url)
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    if not addresses:
        raise ValueError("域名无可用地址")
    for entry in addresses:
        address = ipaddress.ip_address(entry[4][0].split("%")[0])
        if address.version == 4 and address in ipaddress.ip_network('198.18.0.0/15'):
            raise ValueError("域名解析到保留测试网段（可能为代理Fake-IP）；正文直连已拒绝，搜索摘要仍可使用")
        mapped = getattr(address, 'ipv4_mapped', None)
        if (not address.is_global or address.is_multicast or address.is_reserved
                or (mapped and (not mapped.is_global or mapped.is_multicast or mapped.is_reserved))):
            raise ValueError("禁止访问本机、私网或其他非公网地址")
    return parsed, host, addresses


class _PinnedHTTP(http.client.HTTPConnection):
    def __init__(self, host, port, address, timeout):
        super().__init__(host, port, timeout=timeout)
        self.address = address

    def connect(self):
        family, socktype, proto, _, sockaddr = self.address
        self.sock = socket.socket(family, socktype, proto)
        try:
            self.sock.settimeout(self.timeout)
            self.sock.connect(sockaddr)
        except Exception:
            self.sock.close()
            raise


class _PinnedHTTPS(_PinnedHTTP):
    def connect(self):
        super().connect()
        try:
            self.sock = ssl.create_default_context().wrap_socket(self.sock, server_hostname=self.host)
        except Exception:
            self.sock.close()
            raise


def _read_url(url: str) -> tuple[bytes, str, str, str]:
    deadline = time.monotonic() + FETCH_TOTAL_SECONDS
    current = url
    for redirect in range(MAX_REDIRECTS + 1):
        parsed, host, addresses = _public_target(current)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("网页下载超时")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        connection_cls = _PinnedHTTPS if parsed.scheme == "https" else _PinnedHTTP
        connection = connection_cls(host, port, addresses[0], min(FETCH_TIMEOUT, remaining))
        try:
            target = urlunsplit(("", "", parsed.path or "/", parsed.query, ""))
            connection.request("GET", target, headers={"User-Agent": "GuokaoLocalTutor/1.0", "Accept": "text/html,text/plain", "Accept-Encoding": "identity"})
            response = connection.getresponse()
            if response.status in {301, 302, 303, 307, 308}:
                location = response.getheader("Location")
                if not location or redirect == MAX_REDIRECTS:
                    raise ValueError("网页重定向缺少地址或次数过多")
                current = urljoin(current, location)
                continue  # Each destination is resolved and checked before connecting.
            if response.status != 200:
                raise ValueError(f"网页HTTP状态{response.status}")
            if response.getheader("Content-Encoding", "identity").lower() not in {"", "identity"}:
                raise ValueError("不支持压缩网页响应")
            content_type = response.getheader("Content-Type", "").lower()
            if not any(t in content_type for t in ("text/html", "text/plain", "application/xhtml+xml")):
                raise ValueError("仅提取HTML或纯文本网页，请下载文档后导入")
            length = response.getheader("Content-Length")
            if length and int(length) > MAX_WEB_BYTES:
                raise ValueError("网页超过3 MB限制")
            pieces, count = [], 0
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("网页下载超时")
                if connection.sock:
                    connection.sock.settimeout(min(FETCH_TIMEOUT, remaining))
                piece = response.read1(min(65536, MAX_WEB_BYTES + 1 - count))
                if not piece:
                    break
                pieces.append(piece)
                count += len(piece)
                if count > MAX_WEB_BYTES:
                    raise ValueError("网页超过3 MB限制")
            return b"".join(pieces), content_type, current, response.getheader("Last-Modified", "")
        finally:
            connection.close()
    raise ValueError("网页重定向次数过多")


def _stamp(chunks, fetched_at, **metadata):
    for chunk in chunks:
        chunk.update(fetched_at=fetched_at, **metadata)
    return chunks


def fetch_url(url: str) -> tuple[list[dict], list[str]]:
    """Fetch public text with bounded downloads; never runs scripts or reads local URLs."""
    from .ingestion import extract_html, split_chunks
    fetched_at = datetime.now(timezone.utc).isoformat()
    try:
        raw, content_type, final_url, modified = _read_url(url.strip())
        charset = re.search(r"charset\s*=\s*[\"']?([\w-]+)", content_type)
        encoding = charset.group(1) if charset else "utf-8-sig"
        try:
            text = raw.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            text = raw.decode("gb18030", errors="replace")
        text, title = extract_html(text) if "html" in content_type else (text, final_url)
        if len(text.strip()) < 100:
            raise ValueError("未取得足够正文，页面可能需要登录、脚本或OCR")
        chunks = split_chunks(text, title[:200] or final_url, "网页正文（可见文本，未核验内容）", final_url, "web_fulltext")
        _stamp(chunks, fetched_at, requested_url=url, last_modified=modified,
               publication_date="未核验", authority="未核验", extraction="visible_text")
        return chunks, [f"已提取网页文本：{title or final_url}；获取时间{fetched_at}；发布日期与内容权威性未核验"]
    except Exception as exc:
        return [], [f"网页获取失败（{type(exc).__name__}）：{exc}"]


def _official_host(url: str) -> bool:
    host = (urlsplit(url).hostname or "").lower()
    return host.endswith(".gov.cn") or host in {"gov.cn", "news.cn", "people.com.cn"} or host.endswith((".news.cn", ".people.com.cn"))


def search_web(query: str, limit: int = 3) -> tuple[list[dict], list[str]]:
    """Prefer verifiable institutional domains; never invent results on provider failure."""
    from .ingestion import split_chunks
    if not query.strip() or limit <= 0:
        return [], ["请输入检索词并设置正数结果数量"]
    limit = min(limit, 8)
    try:
        from ddgs import DDGS
        client = DDGS(timeout=12)
        results = list(client.text(query.strip(), max_results=min(limit * 3, 20), region="cn-zh"))
    except Exception as exc:
        return [], [f"联网搜索失败（{type(exc).__name__}），未生成替代搜索结果"]
    results.sort(key=lambda item: not _official_host(item.get("href", "")))
    docs, statuses, seen = [], [], set()
    for item in results:
        url = item.get("href", "")
        if not url or url in seen:
            continue
        seen.add(url)
        if len(seen) > limit:
            break
        chunks, notes = fetch_url(url)
        statuses.extend(notes)
        if chunks:
            docs.extend(chunks)
            continue
        # No destination connection occurs for a search-provider snippet. Do not
        # discard it merely because this machine uses reserved Fake-IP DNS.
        try:
            _public_url_syntax(url)
        except Exception:
            statuses.append("已跳过非公开或无效搜索链接")
            continue
        title = str(item.get("title") or url)[:200]
        snippet = str(item.get("body") or "").strip()
        if snippet:
            timestamp = datetime.now(timezone.utc).isoformat()
            rows = split_chunks(snippet, title, "搜索摘要（非网页正文，未核验）", url, "web_snippet_only")
            docs.extend(_stamp(rows, timestamp, search_query=query, publication_date="未核验", authority="未核验", provider="DDGS"))
            statuses.append(f"仅有DDGS搜索摘要：{title}；获取时间{timestamp}；不能作为已读全文或官方答案")
    if not results:
        statuses.append("搜索服务未返回结果")
    return docs, statuses
