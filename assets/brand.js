// assets/brand.js: MattoLAB 표시 줄.
//
// 모양의 확정안과 이유는 매일 읽는 고전 저장소의 `docs/mattolab-footer.md`(시안 A-2).
// 브랜드 규칙 원본은 이 저장소의 `docs/brand/mattolab-brand.md`:
// Sora · `Matto`=Medium(500)/Ink · `LAB`=ExtraBold(800)/Signal Coral. **코랄은 LAB에만.**
// 매일 읽는 고전에도 같은 파일이 있고 링크 방향만 반대다. 한쪽만 고치지 않는다.
import { SITE_NAME, PRODUCTS, LAB_TAGLINE, CONTACT } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 제품 한 칸. 지금 보고 있는 것은 코랄로 두고 링크를 걸지 않는다(자기 자신으로 가는 링크).
const product = (p) => {
  const self = p.name === SITE_NAME;
  const title = self ? `<b class="on">${esc(p.name)}</b>`
                     : `<b><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></b>`;
  return `<span class="p">${title}<em>${esc(p.desc)}</em></span>`;
};

// 연락처 한 줄. 값이 없으면 링크 대신 "준비 중이에요"를 옅게 둔다.
const row = (key, value, href) => {
  const k = `<span class="k">${esc(key)}</span><span class="dash" aria-hidden="true">—</span>`;
  if (!value) return k + `<span class="soon">준비 중이에요</span>`;
  return k + (href ? `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(value)}</a>`
                   : `<span>${esc(value)}</span>`);
};

// 왼쪽에 브랜드와 제품 격자, 오른쪽에 Contact 한 열, 맨 아래 가는 줄에 조회수.
// 제품 격자는 2행을 유지한 채 **오른쪽으로** 자란다(제품 6개면 3열, 12개면 6열).
export const labFooter = ({ withViews = true } = {}) => `<footer class="lab">
      <div class="lab-l">
        <div class="brandline">
          <span class="labmark"><i>Matto</i><b>LAB</b></span>
          <em>${esc(LAB_TAGLINE)}</em>
        </div>
        <div class="prod">${PRODUCTS.map(product).join("")}</div>
      </div>
      <div class="lab-r">
        <span class="lab-label">Contact</span>
        <div class="cx">
          ${row("Email", CONTACT.email, `mailto:${CONTACT.email}`)}
          ${row("Instagram", CONTACT.instagram && `@${CONTACT.instagram}`, CONTACT.instagram && `https://instagram.com/${CONTACT.instagram}`)}
          ${row("Indischool", CONTACT.indischool, null)}
          ${row("Website", CONTACT.website, CONTACT.website)}
        </div>
      </div>
      <div class="lab-tail">${withViews ? `<p class="views" hidden></p>` : ""}</div>
    </footer>`;
