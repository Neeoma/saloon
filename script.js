import braidEditorialUrl from "./images/lagos-braid-editorial.jpg";
import copperCurlsUrl from "./images/copper-curls.jpg";
import braidDetailUrl from "./images/braid-detail.jpg";

const bookingDialog = document.querySelector("#booking-dialog");
const bookingForm = document.querySelector("#booking-form");
const bookingService = document.querySelector("#booking-service");
const bookingDate = document.querySelector("#booking-date");
const bookingSuccess = document.querySelector("#booking-success");
const finderDialog = document.querySelector("#ritual-finder");
const lightboxDialog = document.querySelector("#lookbook-lightbox");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNavigation = document.querySelector("#mobile-navigation");
const siteHeader = document.querySelector("#site-header");
const hero = document.querySelector(".hero");
const heroImage = document.querySelector(".hero-image");
const progressBar = document.querySelector("#reading-progress");
const cursorAura = document.querySelector(".cursor-aura");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

let lastFocusedElement = null;
let finderReturnFocus = null;
let lightboxReturnFocus = null;
let recommendedRitual = null;
let quoteIndex = 0;
let lightboxTransitionTimer = null;
let quoteTimer = null;
let quoteTransitionTimer = null;
let scrollTicking = false;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

if (bookingDate) bookingDate.min = localDateString();

function closeMobileNavigation() {
  if (!menuToggle || !mobileNavigation) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  mobileNavigation.setAttribute("aria-hidden", "true");
  mobileNavigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

function openBooking(focusReturnTarget, serviceOverride) {
  const cameFromMobileNavigation = Boolean(focusReturnTarget?.closest("#mobile-navigation"));
  closeMobileNavigation();
  lastFocusedElement = cameFromMobileNavigation ? menuToggle : (focusReturnTarget || document.activeElement);
  const requestedService = serviceOverride || focusReturnTarget?.dataset?.service;
  const boardSummary = focusReturnTarget?.dataset?.boardSummary;
  if (boardSummary && bookingForm?.elements.namedItem("notes")) {
    bookingForm.elements.namedItem("notes").value = `Moodboard inspiration: ${boardSummary}`;
  }
  if (requestedService && bookingService) {
    const matchingOption = [...bookingService.options].find((option) => option.textContent.trim() === requestedService.trim());
    if (matchingOption) bookingService.value = matchingOption.value || matchingOption.textContent;
  }
  if (bookingSuccess) {
    bookingSuccess.hidden = true;
    bookingSuccess.textContent = "";
  }
  if (bookingDialog?.showModal) {
    bookingDialog.showModal();
    document.body.classList.add("dialog-open");
    window.setTimeout(() => bookingDialog.querySelector("input[name='name']")?.focus(), 60);
  }
}

document.querySelectorAll("[data-book]").forEach((button) => {
  button.addEventListener("click", () => openBooking(button));
});

document.querySelector(".booking-dialog .dialog-close")?.addEventListener("click", () => bookingDialog?.close());
bookingDialog?.addEventListener("click", (event) => {
  if (event.target === bookingDialog) bookingDialog.close();
});
bookingDialog?.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  if (bookingSuccess) {
    bookingSuccess.hidden = true;
    bookingSuccess.textContent = "";
  }
  if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
});

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!bookingForm.reportValidity()) return;

  const formData = new FormData(bookingForm);
  const firstName = String(formData.get("name") || "there").trim().split(/\s+/)[0];
  const service = String(formData.get("service") || "your service");
  const dateValue = String(formData.get("date") || "");
  const date = dateValue
    ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${dateValue}T12:00:00`))
    : "your chosen day";

  bookingSuccess.textContent = `Thanks, ${firstName}! Your request for ${service.toLowerCase()} on ${date} is ready. This demo form is not connected yet, so no booking has been sent.`;
  bookingSuccess.hidden = false;
  bookingSuccess.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "nearest" });
});

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
  mobileNavigation?.setAttribute("aria-hidden", String(isOpen));
  mobileNavigation?.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

mobileNavigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileNavigation));

// The FAQ behaves like a single-open accordion so answers stay easy to scan.
document.querySelectorAll(".faq-item h3 button").forEach((button) => {
  button.addEventListener("click", () => {
    const willOpen = button.getAttribute("aria-expanded") !== "true";
    document.querySelectorAll(".faq-item h3 button").forEach((otherButton) => {
      const panel = document.getElementById(otherButton.getAttribute("aria-controls"));
      otherButton.setAttribute("aria-expanded", "false");
      if (panel) panel.hidden = true;
    });
    button.setAttribute("aria-expanded", String(willOpen));
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    if (answer) answer.hidden = !willOpen;
  });
});

// Scroll progress, the compact floating nav and a subtle hero-image drift.
function updateScrollExperience() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100)) : 0;
  if (progressBar) progressBar.style.width = `${progress}%`;
  siteHeader?.classList.toggle("is-sticky", window.scrollY > 90);
  if (heroImage) heroImage.style.setProperty("--hero-parallax", prefersReducedMotion.matches ? "0px" : `${Math.max(-74, -window.scrollY * 0.11)}px`);
  scrollTicking = false;
}

window.addEventListener("scroll", () => {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(updateScrollExperience);
}, { passive: true });
window.addEventListener("resize", updateScrollExperience, { passive: true });
updateScrollExperience();

const navLinks = [...document.querySelectorAll(".desktop-nav a")];
const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
if ("IntersectionObserver" in window && navSections.length) {
  const sectionVisibility = new Map();
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => sectionVisibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
    const currentSection = [...sectionVisibility.entries()].sort((a, b) => b[1] - a[1])[0];
    navLinks.forEach((link) => {
      const isActive = currentSection?.[1] > 0 && link.getAttribute("href") === `#${currentSection[0].id}`;
      link.classList.toggle("is-active", Boolean(isActive));
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, { threshold: [0.1, 0.25, 0.45, 0.65], rootMargin: "-22% 0px -52% 0px" });
  navSections.forEach((section) => navObserver.observe(section));
}

// Desktop pointer light, cursor ornament and gently magnetic calls to action.
if (finePointer.matches && !prefersReducedMotion.matches) {
  document.addEventListener("pointermove", (event) => {
    if (cursorAura) {
      cursorAura.style.left = `${event.clientX}px`;
      cursorAura.style.top = `${event.clientY}px`;
      cursorAura.classList.add("is-visible");
      cursorAura.classList.toggle("is-interactive", Boolean(event.target.closest("a, button, input, select, textarea")));
    }

    if (hero && event.target.closest(".hero")) {
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty("--spot-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
      hero.style.setProperty("--spot-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
      hero.classList.add("has-pointer");
    } else {
      hero?.classList.remove("has-pointer");
    }
  }, { passive: true });

  document.addEventListener("pointerleave", () => cursorAura?.classList.remove("is-visible"));
  document.querySelectorAll("[data-magnetic]").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const bounds = button.getBoundingClientRect();
      const x = ((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 8;
      const y = ((event.clientY - bounds.top - bounds.height / 2) / bounds.height) * 7;
      button.style.setProperty("--mag-x", `${x.toFixed(1)}px`);
      button.style.setProperty("--mag-y", `${y.toFixed(1)}px`);
    });
    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--mag-x", "0px");
      button.style.setProperty("--mag-y", "0px");
    });
  });
}

// Two-question ritual finder: style mood + chair time become a tailored service suggestion.
const finderMoodButtons = [...document.querySelectorAll("[data-finder-mood]")];
const finderTimeButtons = [...document.querySelectorAll("[data-finder-time]")];
const finderStepOne = document.querySelector('[data-finder-step="1"]');
const finderStepTwo = document.querySelector('[data-finder-step="2"]');
const finderResult = document.querySelector("#finder-result");
const finderStepLabel = document.querySelector("#finder-step-label");
const finderProgressFill = document.querySelector("#finder-progress-fill");
const finderNext = document.querySelector("#finder-next");
const finderBack = document.querySelector("#finder-back");
const finderShowResult = document.querySelector("#finder-result-button");
const finderBook = document.querySelector("#finder-book");
const finderRestart = document.querySelector("#finder-restart");
const finderState = { mood: "", time: "" };

const ritualMatches = {
  protective: {
    service: "Braids & protective styles",
    title: "The protective-style edit",
    copy: "Knotless braids, twists or cornrows, chosen to suit your hair and your real-life routine.",
    image: braidEditorialUrl,
    alt: "Long braids finished with small copper details",
    time: "2–6 HOURS · FROM ₦45K",
  },
  natural: {
    service: "Natural hair rituals",
    title: "Coils in full bloom",
    copy: "A care-first reset for your natural texture: cleanse, treat, define and let your hair breathe.",
    image: copperCurlsUrl,
    alt: "Defined natural coils styled in a copper puff",
    time: "1.5–3 HOURS · FROM ₦28K",
  },
  change: {
    service: "Colour, cut & finish",
    title: "Your new-chapter look",
    copy: "A fresh shape, thoughtful colour or polished finish. We’ll talk through what feels most like you.",
    image: braidDetailUrl,
    alt: "An editorial portrait with detailed braids and gold cuffs",
    time: "1–3 HOURS · FROM ₦30K",
  },
};

function setFinderSelection(buttons, selectedButton, stateKey) {
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(button === selectedButton)));
  finderState[stateKey] = stateKey === "mood" ? selectedButton.dataset.finderMood : selectedButton.dataset.finderTime;
  if (stateKey === "mood" && finderNext) finderNext.disabled = !finderState.mood;
  if (stateKey === "time" && finderShowResult) finderShowResult.disabled = !finderState.time;
}

function resetFinder() {
  finderState.mood = "";
  finderState.time = "";
  finderMoodButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  finderTimeButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  finderStepOne.hidden = false;
  finderStepTwo.hidden = true;
  finderResult.hidden = true;
  finderNext.hidden = false;
  finderNext.disabled = true;
  finderBack.hidden = true;
  finderShowResult.hidden = true;
  finderBook.hidden = true;
  finderRestart.hidden = true;
  finderStepLabel.innerHTML = '01 <i>/</i> 02 <span>YOUR MOOD</span>';
  finderProgressFill?.parentElement.classList.remove("is-complete");
  if (finderProgressFill) finderProgressFill.style.width = "50%";
}

function openFinder(button) {
  closeMobileNavigation();
  finderReturnFocus = button || document.activeElement;
  resetFinder();
  if (finderDialog?.showModal) {
    finderDialog.showModal();
    document.body.classList.add("dialog-open");
    window.setTimeout(() => finderMoodButtons[0]?.focus(), 60);
  }
}

document.querySelectorAll("[data-finder-open]").forEach((button) => button.addEventListener("click", () => openFinder(button)));
document.querySelector("[data-finder-close]")?.addEventListener("click", () => finderDialog?.close());
finderDialog?.addEventListener("click", (event) => {
  if (event.target === finderDialog) finderDialog.close();
});
finderDialog?.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  if (finderReturnFocus?.isConnected) finderReturnFocus.focus();
});
finderMoodButtons.forEach((button) => button.addEventListener("click", () => setFinderSelection(finderMoodButtons, button, "mood")));
finderTimeButtons.forEach((button) => button.addEventListener("click", () => setFinderSelection(finderTimeButtons, button, "time")));

finderNext?.addEventListener("click", () => {
  if (!finderState.mood) return;
  finderStepOne.hidden = true;
  finderStepTwo.hidden = false;
  finderNext.hidden = true;
  finderBack.hidden = false;
  finderShowResult.hidden = false;
  finderShowResult.disabled = !finderState.time;
  finderStepLabel.innerHTML = '02 <i>/</i> 02 <span>YOUR PACE</span>';
  finderProgressFill?.parentElement.classList.add("is-complete");
  if (finderProgressFill) finderProgressFill.style.width = "100%";
  finderTimeButtons[0]?.focus();
});

finderBack?.addEventListener("click", () => {
  finderStepTwo.hidden = true;
  finderStepOne.hidden = false;
  finderNext.hidden = false;
  finderBack.hidden = true;
  finderShowResult.hidden = true;
  finderStepLabel.innerHTML = '01 <i>/</i> 02 <span>YOUR MOOD</span>';
  finderProgressFill?.parentElement.classList.remove("is-complete");
  if (finderProgressFill) finderProgressFill.style.width = "50%";
  finderMoodButtons.find((button) => button.dataset.finderMood === finderState.mood)?.focus();
});

finderShowResult?.addEventListener("click", () => {
  const match = ritualMatches[finderState.mood];
  if (!match || !finderState.time) return;
  recommendedRitual = match;
  document.querySelector("#finder-result-title").textContent = match.title;
  document.querySelector("#finder-result-copy").textContent = finderState.time === "quick"
    ? `${match.copy} We’ll help you find a focused first step that fits your day.`
    : `${match.copy} Put on a good playlist — your chair time is part of the ritual.`;
  document.querySelector("#finder-result-time").textContent = match.time;
  const resultImage = document.querySelector("#finder-result-image");
  resultImage.src = match.image;
  resultImage.alt = match.alt;
  finderStepTwo.hidden = true;
  finderResult.hidden = false;
  finderBack.hidden = true;
  finderShowResult.hidden = true;
  finderBook.hidden = false;
  finderRestart.hidden = false;
  finderStepLabel.innerHTML = '02 <i>/</i> 02 <span>YOUR MATCH</span>';
  finderBook.focus();
});

finderRestart?.addEventListener("click", () => {
  resetFinder();
  finderMoodButtons[0]?.focus();
});
finderBook?.addEventListener("click", () => {
  if (!recommendedRitual) return;
  const returnTarget = finderReturnFocus;
  const service = recommendedRitual.service;
  finderDialog.close();
  window.setTimeout(() => openBooking(returnTarget, service), 80);
});

// Tappable lookbook cards open a keyboard-friendly, arrow-navigable gallery.
const lightboxItems = [...document.querySelectorAll(".look-card")].map((card) => {
  const button = card.querySelector("[data-lightbox-index]");
  const image = button?.querySelector("img");
  const caption = card.querySelector("figcaption span:last-child")?.textContent.replace(/↗/g, "").trim() || "The Crown Room lookbook";
  return { button, src: image?.getAttribute("src"), alt: image?.alt || caption, caption };
});
let lightboxIndex = 0;

function renderLightbox(index) {
  if (!lightboxItems.length) return;
  lightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
  const item = lightboxItems[lightboxIndex];
  const image = document.querySelector("#lightbox-image");
  image.classList.add("is-changing");
  window.clearTimeout(lightboxTransitionTimer);
  lightboxTransitionTimer = window.setTimeout(() => {
    image.src = item.src;
    image.alt = item.alt;
    image.classList.remove("is-changing");
  }, 100);
  document.querySelector("#lightbox-caption").textContent = item.caption;
  document.querySelector("#lightbox-count").textContent = `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(lightboxItems.length).padStart(2, "0")}`;
  document.querySelectorAll("[data-lightbox-thumb]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.lightboxThumb) === lightboxIndex));
  });
}

function openLightbox(index, trigger) {
  lightboxReturnFocus = trigger;
  renderLightbox(index);
  if (lightboxDialog?.showModal) {
    lightboxDialog.showModal();
    document.body.classList.add("dialog-open");
    document.querySelector(".lightbox-close")?.focus();
  }
}

document.querySelectorAll("[data-lightbox-index]").forEach((button) => {
  button.addEventListener("click", () => openLightbox(Number(button.dataset.lightboxIndex), button));
});
document.querySelector(".lightbox-close")?.addEventListener("click", () => lightboxDialog?.close());
document.querySelector(".lightbox-prev")?.addEventListener("click", () => renderLightbox(lightboxIndex - 1));
document.querySelector(".lightbox-next")?.addEventListener("click", () => renderLightbox(lightboxIndex + 1));
document.querySelectorAll("[data-lightbox-thumb]").forEach((button) => button.addEventListener("click", () => renderLightbox(Number(button.dataset.lightboxThumb))));
const lightboxStage = document.querySelector(".lightbox-stage");
let touchStart = null;
lightboxStage?.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
lightboxStage?.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) renderLightbox(lightboxIndex + (deltaX < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
lightboxDialog?.addEventListener("click", (event) => {
  if (event.target === lightboxDialog) lightboxDialog.close();
});
lightboxDialog?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") { event.preventDefault(); renderLightbox(lightboxIndex + 1); }
  if (event.key === "ArrowLeft") { event.preventDefault(); renderLightbox(lightboxIndex - 1); }
});
lightboxDialog?.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  if (lightboxReturnFocus?.isConnected) lightboxReturnFocus.focus();
});

// A persistent mini moodboard makes the lookbook a planning tool, not just a gallery.
const moodboardKey = "crown-room-moodboard-v1";
const moodboardLooks = [
  { title: "THE SOFT STATEMENT · KNOTLESS BRAIDS", image: braidEditorialUrl },
  { title: "COILS, IN FULL BLOOM · NATURAL TEXTURE", image: copperCurlsUrl },
  { title: "THE LITTLE DETAILS · MICRO BRAIDS", image: braidDetailUrl },
];
const boardItems = document.querySelector("#board-items");
const boardDropzone = document.querySelector("#board-dropzone");
const boardEmpty = document.querySelector("#board-empty");
const boardCount = document.querySelector("#board-count");
const boardStatus = document.querySelector("#board-status");
const boardClear = document.querySelector("#board-clear");
const boardBook = document.querySelector("#board-book");
let savedLookIds = [];

try {
  const saved = JSON.parse(window.localStorage.getItem(moodboardKey) || "[]");
  if (Array.isArray(saved)) savedLookIds = [...new Set(saved.map(Number).filter((index) => Number.isInteger(index) && moodboardLooks[index]))];
} catch {
  savedLookIds = [];
}

function persistMoodboard() {
  try { window.localStorage.setItem(moodboardKey, JSON.stringify(savedLookIds)); } catch { /* private browsing may disable storage */ }
}

function renderMoodboard(message) {
  if (!boardItems) return;
  boardItems.replaceChildren();
  savedLookIds.forEach((index) => {
    const look = moodboardLooks[index];
    const card = document.createElement("div");
    card.className = "board-item";
    const image = document.createElement("img");
    image.src = look.image;
    image.alt = "";
    const title = document.createElement("span");
    title.textContent = look.title;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${look.title.toLowerCase()} from your moodboard`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeLook(index));
    card.append(image, title, remove);
    boardItems.append(card);
  });
  if (boardEmpty) boardEmpty.hidden = savedLookIds.length > 0;
  if (boardCount) boardCount.textContent = `${savedLookIds.length} / ${moodboardLooks.length}`;
  if (boardClear) boardClear.disabled = savedLookIds.length === 0;
  if (boardBook) {
    boardBook.disabled = savedLookIds.length === 0;
    if (savedLookIds.length) boardBook.dataset.boardSummary = savedLookIds.map((index) => moodboardLooks[index].title).join("; ");
    else delete boardBook.dataset.boardSummary;
  }
  document.querySelectorAll("[data-save-look]").forEach((button) => {
    const saved = savedLookIds.includes(Number(button.dataset.saveLook));
    button.setAttribute("aria-pressed", String(saved));
    button.querySelector("b").textContent = saved ? "✓" : "+";
    button.lastChild.textContent = saved ? " Saved to moodboard" : " Save to moodboard";
  });
  if (boardStatus) boardStatus.textContent = message || (savedLookIds.length ? `${savedLookIds.length} look${savedLookIds.length === 1 ? "" : "s"} saved. Bring this board to your consultation.` : "Your saved looks stay private to this browser.");
}

function addLook(index) {
  if (!moodboardLooks[index]) return;
  if (savedLookIds.includes(index)) {
    savedLookIds = savedLookIds.filter((lookId) => lookId !== index);
    persistMoodboard();
    renderMoodboard("Look removed from your moodboard.");
    return;
  }
  savedLookIds.push(index);
  persistMoodboard();
  renderMoodboard(`${moodboardLooks[index].title.split(" · ")[0]} added to your moodboard.`);
}

function removeLook(index) {
  savedLookIds = savedLookIds.filter((lookId) => lookId !== index);
  persistMoodboard();
  renderMoodboard("Look removed from your moodboard.");
}

document.querySelectorAll("[data-save-look]").forEach((button) => {
  button.addEventListener("click", () => addLook(Number(button.dataset.saveLook)));
});
document.querySelectorAll("[data-drag-look]").forEach((button) => {
  button.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/plain", button.dataset.dragLook);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
    button.classList.add("is-dragging");
  });
  button.addEventListener("dragend", () => button.classList.remove("is-dragging"));
});
boardDropzone?.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  boardDropzone.classList.add("is-dragover");
});
boardDropzone?.addEventListener("dragleave", (event) => {
  if (!boardDropzone.contains(event.relatedTarget)) boardDropzone.classList.remove("is-dragover");
});
boardDropzone?.addEventListener("drop", (event) => {
  event.preventDefault();
  boardDropzone.classList.remove("is-dragover");
  const id = Number(event.dataTransfer?.getData("text/plain"));
  if (Number.isInteger(id) && moodboardLooks[id]) addLook(id);
});
boardClear?.addEventListener("click", () => {
  savedLookIds = [];
  persistMoodboard();
  renderMoodboard("Your moodboard is clear. Save a look whenever inspiration strikes.");
});
renderMoodboard();

// Rotating client notes. It pauses as soon as someone interacts with the story.
const clientStories = [
  { quote: '“I came for the braids.<br />I left feeling like <em>myself</em><br />again — just shinier.”', author: 'ADAORA E. <i>·</i> CLIENT SINCE 2022' },
  { quote: '“They listened to what my hair needed.<br />I walked out with <em>soft twists</em><br />and a new wash-day ritual.”', author: 'MARIAM O. <i>·</i> CLIENT SINCE 2024' },
  { quote: '“The playlist, the care, the compliments at brunch.<br />I felt <em>held</em> before the first braid<br />was even in.”', author: 'TOMI A. <i>·</i> CLIENT SINCE 2023' },
];
const quoteCarousel = document.querySelector(".quote-carousel");
const quoteText = document.querySelector("#kind-words-title");
const quoteAuthor = document.querySelector(".quote-author");
const quoteCurrent = document.querySelector("#quote-current");
const quoteDots = [...document.querySelectorAll("[data-quote-index]")];
const quoteSection = document.querySelector(".kind-words");
const quoteToggle = document.querySelector("[data-quote-toggle]");
let quoteRotationPaused = false;

function setQuote(index) {
  quoteIndex = (index + clientStories.length) % clientStories.length;
  quoteCarousel?.classList.add("is-transitioning");
  window.clearTimeout(quoteTransitionTimer);
  quoteTransitionTimer = window.setTimeout(() => {
    const story = clientStories[quoteIndex];
    if (quoteText) quoteText.innerHTML = story.quote;
    if (quoteAuthor) quoteAuthor.innerHTML = story.author;
    if (quoteCurrent) quoteCurrent.textContent = String(quoteIndex + 1).padStart(2, "0");
    quoteDots.forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === quoteIndex)));
    quoteCarousel?.classList.remove("is-transitioning");
  }, prefersReducedMotion.matches ? 0 : 190);
}

function startQuoteRotation() {
  if (prefersReducedMotion.matches) {
    if (quoteToggle) quoteToggle.hidden = true;
    return;
  }
  if (quoteTimer) return;
  quoteTimer = window.setInterval(() => {
    if (document.hidden || quoteRotationPaused || quoteSection?.matches(":hover, :focus-within")) return;
    setQuote(quoteIndex + 1);
  }, 7600);
}

document.querySelector("[data-quote-prev]")?.addEventListener("click", () => setQuote(quoteIndex - 1));
document.querySelector("[data-quote-next]")?.addEventListener("click", () => setQuote(quoteIndex + 1));
quoteDots.forEach((button) => button.addEventListener("click", () => setQuote(Number(button.dataset.quoteIndex))));
quoteToggle?.addEventListener("click", () => {
  quoteRotationPaused = !quoteRotationPaused;
  quoteToggle.setAttribute("aria-pressed", String(quoteRotationPaused));
  quoteToggle.setAttribute("aria-label", quoteRotationPaused ? "Resume automatic client story rotation" : "Pause automatic client story rotation");
  quoteToggle.textContent = quoteRotationPaused ? "▶" : "Ⅱ";
});
startQuoteRotation();

// Scroll reveals; elements become visible by default in older browsers.
const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const year = document.querySelector("#current-year");
if (year) year.textContent = new Date().getFullYear();

// Avoid leaving the menu open if a wider viewport is restored.
const desktopMedia = window.matchMedia("(min-width: 851px)");
if (desktopMedia.addEventListener) desktopMedia.addEventListener("change", (event) => { if (event.matches) closeMobileNavigation(); });
else desktopMedia.addListener?.((event) => { if (event.matches) closeMobileNavigation(); });
