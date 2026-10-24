import { build } from 'esbuild'
await build({
  entryPoints: ['src/client/index.jsx'], outfile: 'lib/client.js', bundle: true,
  format: 'cjs', platform: 'browser', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis'],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-tutorloop",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' },
})
