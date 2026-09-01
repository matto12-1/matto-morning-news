// assets/brand.js: MattoLAB 표시 줄.
//
// 규칙 출처는 `docs/brand/mattolab-brand.md`다:
// Sora · `Matto`=Medium(500)/Ink · `LAB`=ExtraBold(800)/Signal Coral. **코랄은 LAB에만.**
// 매일 읽는 고전(그쪽 `assets/brand.js`)에도 같은 모양·같은 문구로 서 있고,
// 링크 방향만 반대다. 한쪽만 고치지 않는다.
import { SITE_NAME, SIBLING, CONTACT } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Contact 한 칸. 오른쪽 열(v2)은 가는 세로선으로 왼쪽 열과 갈린다.
// 값이 없으면 링크 대신 "준비 중이에요"를 옅게 둔다: 없는 링크를 누르게 하지 않는다.
const row = (key, value, href, right) => {
  const k = `<span class="k${right ? " v2" : ""}">${esc(key)}</span><span class="dash" aria-hidden="true">—</span>`;
  if (!value) return k + `<span class="soon">준비 중이에요</span>`;
  return k + (href ? `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(value)}</a>`
                   : `<span>${esc(value)}</span>`);
};

// withViews=false면 조회수 자리를 두지 않는다(지난 호 화면은 조회수를 세지 않는다).
export const labFooter = ({ withViews = true } = {}) => `<footer class="lab">
      <div class="lab-l">
        <span class="lab-top">
          <span class="labmark"><i>Matto</i><b>LAB</b></span>
          <span class="labrow"><span class="here">${esc(SITE_NAME)}</span><span class="dot">·</span><a href="${esc(SIBLING.url)}" target="_blank" rel="noopener">${esc(SIBLING.name)}</a></span>
        </span>
        <div class="cxwrap">
          <div class="cxbar" aria-hidden="true"></div>
          <div>
            <div class="lab-label">Contact</div>
            <div class="cx">
              ${row("Email", CONTACT.email, `mailto:${CONTACT.email}`)}
              ${row("Indischool", CONTACT.indischool, null, true)}
              ${row("Instagram", CONTACT.instagram && `@${CONTACT.instagram}`, CONTACT.instagram && `https://instagram.com/${CONTACT.instagram}`)}
              ${row("Website", CONTACT.website, CONTACT.website, true)}
            </div>
          </div>
        </div>
      </div>
      ${withViews ? `<p class="views" hidden></p>` : ""}
    </footer>`;
