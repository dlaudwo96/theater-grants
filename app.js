const CATEGORY_CLASS = {
  "중앙정부/공공기관": "cat-central",
  "지역문화재단": "cat-region",
  "민간/기업": "cat-private",
};

const STATUS_CLASS = {
  "모집중": "status-open",
  "예정": "status-upcoming",
  "상시": "status-ongoing",
  "마감": "status-closed",
};

let allPrograms = [];
let currentCategory = "전체";
let currentStatus = "전체";
let currentQuery = "";

function computeStatus(p) {
  const state = p["원문상태"] || "";
  if (state.includes("마감") || state.includes("종료") || state.includes("완료")) return "마감";
  if (state.includes("상시") || state.includes("추천제")) return "상시";
  const today = new Date().toISOString().slice(0, 10);
  const start = p["신청기간_시작"];
  const end = p["신청기간_마감"];
  if (end && end < today) return "마감";
  if (start && start > today) return "예정";
  if (end || start) return "모집중";
  return "상시";
}

function statusSortKey(p, status) {
  if (status === "마감") return "9999-99-99";
  return p["신청기간_마감"] || p["신청기간_시작"] || "9999-99-99";
}

function render() {
  const grid = document.getElementById("cardGrid");
  const empty = document.getElementById("emptyState");
  const q = currentQuery.trim().toLowerCase();

  let filtered = allPrograms.filter((p) => {
    const status = computeStatus(p);
    if (currentCategory !== "전체" && p["카테고리"] !== currentCategory) return false;
    if (currentStatus !== "전체" && status !== currentStatus) return false;
    if (q) {
      const haystack = `${p["사업명"]} ${p["주관기관"]}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const sa = computeStatus(a);
    const sb = computeStatus(b);
    if (sa === "마감" && sb !== "마감") return 1;
    if (sb === "마감" && sa !== "마감") return -1;
    return statusSortKey(a, sa).localeCompare(statusSortKey(b, sb));
  });

  grid.innerHTML = "";
  empty.hidden = filtered.length !== 0;

  for (const p of filtered) {
    const status = computeStatus(p);
    const card = document.createElement("article");
    card.className = "card";

    const period = p["신청기간_시작"] && p["신청기간_마감"]
      ? `${p["신청기간_시작"]} ~ ${p["신청기간_마감"]}`
      : (p["원문상태"] || "미정");

    card.innerHTML = `
      <div class="card-tags">
        <span class="tag ${CATEGORY_CLASS[p["카테고리"]] || ""}">${p["카테고리"] || ""}</span>
        <span class="tag ${STATUS_CLASS[status] || ""}">${status}</span>
      </div>
      <h2>${escapeHtml(p["사업명"] || "")}</h2>
      <p class="org">${escapeHtml(p["주관기관"] || "")}${p["지역"] ? " · " + escapeHtml(p["지역"]) : ""}</p>
      <dl>
        <dt>지원대상</dt><dd>${escapeHtml(p["지원대상"] || "-")}</dd>
        <dt>지원내용</dt><dd>${escapeHtml(p["지원내용"] || "-")}</dd>
        <dt>신청기간</dt><dd>${escapeHtml(period)}</dd>
        <dt>신청방법</dt><dd>${escapeHtml(p["신청방법"] || "-")}</dd>
      </dl>
      ${p["비고"] ? `<p class="note">${escapeHtml(p["비고"])}</p>` : ""}
      <div class="links">
        ${p["원본공고링크"] ? `<a href="${escapeAttr(p["원본공고링크"])}" target="_blank" rel="noopener">원본 공고</a>` : ""}
        ${p["신청링크"] ? `<a href="${escapeAttr(p["신청링크"])}" target="_blank" rel="noopener">신청하기</a>` : ""}
      </div>
    `;
    grid.appendChild(card);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function setupControls() {
  document.querySelectorAll("#categoryFilters .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#categoryFilters .filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("#statusFilters .status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#statusFilters .status-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentStatus = btn.dataset.status;
      render();
    });
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentQuery = e.target.value;
    render();
  });
}

async function init() {
  setupControls();
  try {
    const res = await fetch(`data/programs.json?v=${Date.now()}`);
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    allPrograms = data.programs || [];
    const updated = data.last_updated ? data.last_updated.slice(0, 10) : "-";
    document.getElementById("lastUpdated").textContent = `최종 업데이트: ${updated}`;
    render();
  } catch (err) {
    document.getElementById("loadError").hidden = false;
    document.getElementById("lastUpdated").textContent = "최종 업데이트: 불러오기 실패";
  }
}

init();
