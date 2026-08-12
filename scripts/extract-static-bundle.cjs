const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = '/Users/syakir/Project/Prudential BSN Takaful/pru-bsn-client-form/quotation created/design_handoff_prubsn_quotation';
const yusufSourceRoot = '/Users/syakir/Project/Prudential BSN Takaful/Quotation Generator/Quotation Created /design_handoff_prubsn_quotation';

const pages = [
  {
    source: path.join(sourceRoot, 'prubsn-quotation-prototype.html'),
    output: path.join(projectRoot, 'index.html'),
    assetDir: 'assets/quotation',
    staticQuotation: true
  },
  {
    source: path.join(sourceRoot, 'client-detail-form.html'),
    output: path.join(projectRoot, 'client-detail-form.html'),
    assetDir: 'assets/form'
  },
  {
    source: path.join(yusufSourceRoot, 'yusuf-quotation-prototype.html'),
    output: path.join(projectRoot, 'yusuf', 'index.html'),
    assetDir: 'assets/quotation',
    responsiveComparison: true
  },
  {
    source: path.join(yusufSourceRoot, 'yusuf-client-detail-form.html'),
    output: path.join(projectRoot, 'yusuf', 'yusuf-client-detail-form.html'),
    assetDir: 'assets/form'
  }
];

const extensions = new Map([
  ['application/javascript', 'js'],
  ['text/javascript', 'js'],
  ['text/css', 'css'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/svg+xml', 'svg'],
  ['image/webp', 'webp'],
  ['audio/mpeg', 'mp3'],
  ['font/woff2', 'woff2'],
  ['font/woff', 'woff'],
  ['application/font-woff', 'woff'],
  ['application/octet-stream', 'bin']
]);

function scriptPayload(source, type) {
  const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`<script[^>]+type=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match) throw new Error(`Missing ${type} payload`);
  return match[1];
}

function writePage(page) {
  const wrapper = fs.readFileSync(page.source, 'utf8');
  const manifest = JSON.parse(scriptPayload(wrapper, '__bundler/manifest'));
  let template = JSON.parse(scriptPayload(wrapper, '__bundler/template'));
  const extRaw = scriptPayload(wrapper, '__bundler/ext_resources');
  const externalResources = extRaw.trim() ? JSON.parse(extRaw) : [];
  const outputRoot = path.dirname(page.output);
  const outputAssets = path.join(outputRoot, page.assetDir);
  fs.mkdirSync(outputAssets, { recursive: true });

  const urls = {};
  for (const [uuid, entry] of Object.entries(manifest)) {
    const encoded = Buffer.from(entry.data, 'base64');
    const bytes = entry.compressed ? zlib.gunzipSync(encoded) : encoded;
    const extension = extensions.get(entry.mime) || 'bin';
    const filename = `${uuid}.${extension}`;
    fs.writeFileSync(path.join(outputAssets, filename), bytes);
    urls[uuid] = `${page.assetDir}/${filename}`;
  }

  for (const [uuid, url] of Object.entries(urls)) {
    template = template.split(uuid).join(url);
  }

  template = template
    .replace(/\s+integrity="[^"]*"/gi, '')
    .replace(/\s+crossorigin="[^"]*"/gi, '');

  const resourceMap = {};
  for (const resource of externalResources) {
    if (urls[resource.uuid]) resourceMap[resource.id] = urls[resource.uuid];
  }
  const resourceScript = `<script>window.__resources=${JSON.stringify(resourceMap).replace(/<\//g, '<\\/')};<\/script>`;
  template = template.replace(/<head([^>]*)>/i, `<head$1>${resourceScript}`);

  if (page.responsiveComparison) {
    const comparisonFix = `<style>
#compare-grid{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)!important;width:100%;max-width:100%;}
#compare-grid>div{min-width:0;overflow-wrap:anywhere;word-break:break-word;hyphens:auto;}
@media(max-width:380px){#compare-grid{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)!important;}}
</style>`;
    template = template.replace(/<head([^>]*)>/i, `<head$1>${comparisonFix}`);
  }

  if (page.staticQuotation) {
    template = template
      .replace(/<script>window\.__resources=[\s\S]*?<\/script>/i, '')
      .replace(/<script\s+src="assets\/quotation\/[^"]+\.js"><\/script>/i, '')
      .replace(/<\/?(?:x-dc|helmet)>/gi, '')
      .replace(/\s+sc-camel-view-box=/gi, ' viewBox=')
      .replace(/\s+sc-camel-on-click="[^"]*"/gi, '')
      .replace(/<!-- INTRO SPLASH -->[\s\S]*?<!-- INTRO -->/i, '<!-- INTRO -->')
      .replace(/<script\s+type="text\/x-dc"[\s\S]*?<\/script>/i, '')
      .replace('style="{{ donutSeg1Style }}"', 'style="stroke-dashoffset:39.8"')
      .replace('style="{{ donutSeg2Style }}"', 'style="stroke-dashoffset:504.4;transform:rotate(332.7deg);transform-origin:100px 100px"')
      .replace('style="{{ donutSeg3Style }}"', 'style="stroke-dashoffset:511.1;transform:rotate(348.6deg);transform-origin:100px 100px"');

    const legacyHead = `<title>PruBSN AnugerahMax Quotation — Anis</title>
<style>
  html{scroll-behavior:smooth}body{overflow-x:hidden}
  .reveal,.zoom-item{opacity:1!important;transform:none!important}
  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>`;
    template = template.replace(/<head([^>]*)>/i, `<head$1>${legacyHead}`);

    const legacyScript = `<script>(function(){
function ready(){
 var all=document.querySelectorAll('.reveal,[data-final-width],[data-final-offset]');
 for(var i=0;i<all.length;i++){
  all[i].setAttribute('data-visible','');
  if(all[i].getAttribute('data-final-width'))all[i].style.width=all[i].getAttribute('data-final-width');
  if(all[i].getAttribute('data-final-offset'))all[i].style.strokeDashoffset=all[i].getAttribute('data-final-offset');
 }
 var zoom=document.querySelectorAll('.zoom-item');
 for(var j=0;j<zoom.length;j++){zoom[j].style.opacity='1';zoom[j].style.transform='none';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
}());<\/script>`;
    template = template.replace(/<\/body>/i, `${legacyScript}</body>`);
  }
  fs.writeFileSync(page.output, template);

  console.log(`${path.basename(page.output)}: ${Buffer.byteLength(template)} bytes, ${Object.keys(manifest).length} assets`);
}

for (const page of pages) {
  if (!fs.existsSync(page.source)) {
    console.log(`Skipped missing source: ${page.source}`);
    continue;
  }
  writePage(page);
}
