#!/usr/bin/env node
/**
 * Downloads every image/icon used by the auth module straight from the Figma file
 * (Hireloop (Copy) → "MObile App" page) into assets/figma/.
 *
 *   node scripts/fetch-figma-assets.mjs
 *
 * The URLs below were issued by the Figma MCP export on 17 Oct 2026 and expire after
 * 7 days (around 24 Oct 2026). If they have expired, export the same layers manually
 * from Figma (the node id for each file is listed next to it) with the same file name.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'figma');
const A = 'https://www.figma.com/api/mcp/asset/';

/** file name → [url, figma node, what it is] */
const ASSETS = {
  // Images
  'logo.png': [`${A}44e3f9af-5c64-4890-b265-95067006f2da/7daa7.png`, '262:169', 'KD Ascend logo (L1)'],
  'doodle-header.png': [`${A}f21bda64-4952-445e-ab94-8701c3c26de5.png`, '141:1044', 'Header doodle pattern (Mask group)'],
  'doodle-splash-top.png': [`${A}3b450bb8-795b-421b-af22-6d32963d871a.png`, '141:1102', 'Splash doodle, top'],
  'doodle-splash-bottom.png': [`${A}40a26d36-7905-421d-abcb-f5ba9e3afd48.png`, '141:1105', 'Splash doodle, bottom'],
  'paynow.png': [`${A}82c21fe8-1c83-46c4-b1a9-940fe599ee1c/d4f68.png`, '141:1752', 'PayNow logo (image 10)'],
  'calendar-selected.png': [`${A}17e8eeb6-6d45-4cff-b334-2dccc8b635f2/b1b11.png`, '215:433', 'Selected day circle (Ellipse 1428)'],

  // Illustrations
  'illus-key.svg': [`${A}ea2550ad-9376-4198-a377-8acf104dda10.svg`, '357:211', 'Key illustration (verification channel modal)'],
  'illus-party.svg': [`${A}32f2f8d0-3a0f-42de-ae03-f5ecbc06fba8/148f3.svg`, '141:1438', 'Party popper (success modals)'],

  // Icons
  'icon-eye.svg': [`${A}a2bbe377-30d0-4688-bd67-736ec0617942.svg`, '141:1076', 'Password eye'],
  'icon-login.svg': [`${A}44e3f9af-5c64-4890-b265-95067006f2da/4c819.svg`, '141:1087', 'Login button icon'],
  'icon-register.svg': [`${A}8d42b09f-17f1-4b25-b748-5478028d241f/e61f5.svg`, '141:1174', 'Register button icon'],
  'icon-close-bg.svg': [`${A}1fd845cb-1a35-4602-a1de-9fa2cc35d0cd/dc7a3.svg`, '357:206', 'Modal close button circle'],
  'icon-close.svg': [`${A}1fd845cb-1a35-4602-a1de-9fa2cc35d0cd/4119f.svg`, '357:208', 'Modal close X'],
  'icon-email.svg': [`${A}1fd845cb-1a35-4602-a1de-9fa2cc35d0cd/9caac.svg`, '357:231', 'Via Email icon'],
  'icon-sms.svg': [`${A}1fd845cb-1a35-4602-a1de-9fa2cc35d0cd/9264d.svg`, '357:237', 'Via SMS icon'],
  'icon-arrow-right.svg': [`${A}32f2f8d0-3a0f-42de-ae03-f5ecbc06fba8/0282a.svg`, '141:1460', 'White arrow (Next / Go To Login)'],
  'icon-arrow-dark.svg': [`${A}6553e7f9-e893-41e8-8aab-0754adb40119/c416e.svg`, '141:1691', 'Dark arrow (Back button)'],
  'icon-chevron-down.svg': [`${A}36ddf63e-95f2-47b7-93ae-ba68b4c8d482/093df.svg`, '271:839', 'Select chevron'],
  'icon-calendar.svg': [`${A}36ddf63e-95f2-47b7-93ae-ba68b4c8d482/b226b.svg`, '271:835', 'Date field calendar'],
  'icon-tick-small.svg': [`${A}6553e7f9-e893-41e8-8aab-0754adb40119/16aa7.svg`, '141:1667', 'Small white tick'],
  'icon-tick-step.svg': [`${A}6553e7f9-e893-41e8-8aab-0754adb40119/20957.svg`, '141:1702', 'Stepper tick'],
  'icon-upload.svg': [`${A}6553e7f9-e893-41e8-8aab-0754adb40119/588ae.svg`, '141:1680', 'Upload cloud'],
  'icon-back.svg': [`${A}ea923a73-289c-47f2-9af9-b39874fea595/bf8fc.svg`, '193:401', 'Header back chevron'],
  'icon-radio-on.svg': [`${A}82c21fe8-1c83-46c4-b1a9-940fe599ee1c/028df.svg`, '141:1753', 'Selected radio'],
  'icon-bank.svg': [`${A}82c21fe8-1c83-46c4-b1a9-940fe599ee1c/8198b.svg`, '141:1758', 'Bank card icon'],
  'icon-calendar-nav.svg': [`${A}17e8eeb6-6d45-4cff-b334-2dccc8b635f2/37ca3.svg`, '215:444', 'Calendar prev/next arrows'],
};

await mkdir(outDir, { recursive: true });

let failed = 0;
for (const [file, [url, node, label]] of Object.entries(ASSETS)) {
  const dest = join(outDir, file);
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error('empty response');
    await writeFile(dest, buf);
    console.log(`✓ ${file.padEnd(26)} ${String(buf.length).padStart(7)} bytes  (${label})`);
  } catch (err) {
    failed += 1;
    let note = '';
    try {
      await stat(dest);
      note = ' — kept the existing file';
    } catch {}
    console.error(`✗ ${file.padEnd(26)} ${err.message}${note}  → export node ${node} (${label}) from Figma`);
  }
}

if (failed) {
  console.error(`\n${failed} asset(s) could not be downloaded. The Figma links expire 7 days after export;`);
  console.error('export the listed layers manually (PNG @3x for images, SVG for icons) into assets/figma/.');
  process.exit(1);
}
console.log(`\nAll ${Object.keys(ASSETS).length} assets saved to assets/figma/`);
