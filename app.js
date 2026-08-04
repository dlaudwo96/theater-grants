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

const TYPE_CLASS = {
  "지원사업": "type-grant",
  "오디션/캐스팅": "type-audition",
  "공모전": "type-contest",
  "워크숍/교육": "type-workshop",
};

let allPrograms = [];
let currentCategory = "전체";
let currentStatus = "전체";
let currentRegion = "전체";
let currentType = "전체";
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

function formatDeadline(p) {
  if (p["신청기간_마감"]) return "~" + p["신청기간_마감"].slice(5).replace("-", ".");
  if (p["원문상태"]) return p["원문상태"];
  return computeStatus(p) === "상시" ? "상시" : "미정";
}

function isNew(p) {
  if (!p["최종확인일"]) return false;
  const confirmed = new Date(p["최종확인일"]);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const diffDays = (today - confirmed) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

function render() {
  const board = document.getElementById("listBoard");
  const empty = document.getElementById("emptyState");
  const q = currentQuery.trim().toLowerCase();

  let filtered = allPrograms.filter((p) => {
    const status = computeStatus(p);
    const type = p["유형"] || "지원사업";
    if (currentCategory !== "전체" && p["카테고리"] !== currentCategory) return false;
    if (currentStatus !== "전체" && status !== currentStatus) return false;
    if (currentType !== "전체" && type !== currentType) return false;
    if (currentRegion !== "전체") {
      if (currentRegion === "전국") {
        if (p["지역"] !== null) return false;
      } else if (p["지역"] !== currentRegion) {
        return false;
      }
    }
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

  board.innerHTML = "";
  empty.hidden = filtered.length !== 0;

  for (const p of filtered) {
    const status = computeStatus(p);
    const type = p["유형"] || "지원사업";
    const row = document.createElement("article");
    row.className = "list-row";

    const summary = p["지원내용"] || p["지원대상"] || p["비고"] || "";

    row.innerHTML = `
      <div class="row-main">
        <span class="tag ${TYPE_CLASS[type] || ""}">${escapeHtml(type)}</span>
        <span class="tag ${CATEGORY_CLASS[p["카테고리"]] || ""}">${escapeHtml(p["카테고리"] || "")}</span>
        <span class="tag ${STATUS_CLASS[status] || ""}">${status}</span>
        <a class="row-title" href="${escapeAttr(p["원본공고링크"] || "#")}" target="_blank" rel="noopener">
          <span class="row-org">[${escapeHtml(p["주관기관"] || "")}]</span>
          ${escapeHtml(p["사업명"] || "")}
          <span class="row-deadline">(${escapeHtml(formatDeadline(p))})</span>
        </a>
        ${isNew(p) ? '<span class="new-badge">NEW</span>' : ""}
      </div>
      ${summary ? `<p class="row-summary">${p["지역"] ? `[${escapeHtml(p["지역"])}] ` : ""}${escapeHtml(summary)}</p>` : ""}
    `;
    board.appendChild(row);
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

function populateRegionFilter() {
  const select = document.getElementById("regionFilter");
  const regions = [...new Set(allPrograms.map((p) => p["지역"]).filter((r) => r))].sort((a, b) =>
    a.localeCompare(b, "ko")
  );
  const hasNationwide = allPrograms.some((p) => p["지역"] === null);

  const options = ['<option value="전체">전체 지역</option>'];
  if (hasNationwide) options.push('<option value="전국">전국</option>');
  for (const region of regions) {
    options.push(`<option value="${escapeAttr(region)}">${escapeHtml(region)}</option>`);
  }
  select.innerHTML = options.join("");
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

  document.querySelectorAll("#typeFilters .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#typeFilters .filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type;
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

  document.getElementById("regionFilter").addEventListener("change", (e) => {
    currentRegion = e.target.value;
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
    populateRegionFilter();
    render();
  } catch (err) {
    document.getElementById("loadError").hidden = false;
    document.getElementById("lastUpdated").textContent = "최종 업데이트: 불러오기 실패";
  }
}

init();
