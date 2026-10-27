import { MENU, countItems, loadCart, saveCart, setQuantity, totalPrice } from "./cart.js";

const drawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#cart-backdrop");
const openButton = document.querySelector("#open-cart");
const closeButton = document.querySelector("#close-cart");
const itemsElement = document.querySelector("#cart-items");
const announcement = document.querySelector("#cart-announcement");
const bagCount = document.querySelector("#bag-count");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

let cart = loadCart(window.localStorage);
let focusBeforeDrawer = null;
let lastRenderedCount = countItems(cart);
let cartMotion = null;
let backdropMotion = null;
let cartTransition = 0;

function playBagFeedback() {
  if (reducedMotion.matches) return;
  bagCount.classList.remove("is-bouncing");
  void bagCount.offsetWidth;
  bagCount.classList.add("is-bouncing");
}

function renderCart() {
  const count = countItems(cart);
  bagCount.textContent = count;
  if (count !== lastRenderedCount) playBagFeedback();
  lastRenderedCount = count;
  openButton.setAttribute("aria-label", `Open your order, ${count} ${count === 1 ? "item" : "items"}`);
  document.querySelector("#cart-total").textContent = currency.format(totalPrice(cart));

  if (count === 0) {
    itemsElement.innerHTML = '<div class="cart-empty"><span aria-hidden="true">◷</span><h3>Something good starts here.</h3><p>Your order is empty. Take a look at the menu.</p></div>';
    return;
  }

  itemsElement.replaceChildren();
  for (const [id, quantity] of Object.entries(cart)) {
    const item = MENU[id];
    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${item.image}" alt="" width="88" height="76" />
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p>${currency.format(item.price)} each</p>
        <div class="quantity-controls" aria-label="Quantity for ${item.name}">
          <button type="button" data-decrease="${id}" aria-label="Remove one ${item.name}">−</button>
          <span aria-label="Quantity ${quantity}">${quantity}</span>
          <button type="button" data-increase="${id}" aria-label="Add one ${item.name}" ${quantity >= 99 ? "disabled" : ""}>+</button>
        </div>
      </div>
      <div class="cart-item-end"><strong>${currency.format(item.price * quantity)}</strong><button type="button" data-remove="${id}" aria-label="Remove ${item.name} from your order">Remove</button></div>`;
    itemsElement.append(row);
  }
}

function changeCart(next, message) {
  cart = next;
  saveCart(window.localStorage, cart);
  renderCart();
  announcement.textContent = message;
}

function openCart() {
  const wasHidden = drawer.hidden;
  if (wasHidden) focusBeforeDrawer = document.activeElement;
  cartTransition += 1;
  cartMotion?.cancel();
  backdropMotion?.cancel();
  backdrop.hidden = false;
  drawer.hidden = false;
  document.body.classList.add("cart-open");
  if (!reducedMotion.matches && drawer.animate && wasHidden) {
    cartMotion = drawer.animate(
      [{ transform: "translate3d(100%, 0, 0)", opacity: .88 }, { transform: "translate3d(0, 0, 0)", opacity: 1 }],
      { duration: 520, easing: "cubic-bezier(.22, 1, .36, 1)" },
    );
    backdropMotion = backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
  }
  closeButton.focus();
}

function closeCart() {
  if (drawer.hidden) return;
  const transition = ++cartTransition;
  cartMotion?.cancel();
  backdropMotion?.cancel();
  const finish = () => {
    if (transition !== cartTransition) return;
    backdrop.hidden = true;
    drawer.hidden = true;
    cartMotion?.cancel();
    backdropMotion?.cancel();
    document.body.classList.remove("cart-open");
    focusBeforeDrawer?.focus();
  };
  if (reducedMotion.matches || !drawer.animate) {
    finish();
    return;
  }
  cartMotion = drawer.animate(
    [{ transform: "translate3d(0, 0, 0)", opacity: 1 }, { transform: "translate3d(100%, 0, 0)", opacity: .88 }],
    { duration: 330, easing: "cubic-bezier(.55, 0, .85, .36)", fill: "forwards" },
  );
  backdropMotion = backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-in", fill: "forwards" });
  cartMotion.finished.then(finish, () => {});
}

function setupScrollReveals() {
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  const targets = [...document.querySelectorAll("[data-reveal]")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const target = entry.target;
      target.addEventListener("transitionend", () => target.classList.remove("will-reveal", "is-visible"), { once: true });
      target.classList.add("is-visible");
      observer.unobserve(target);
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: .08 });

  for (const target of targets) {
    if (target.getBoundingClientRect().top < window.innerHeight * .88) continue;
    target.classList.add("will-reveal");
    observer.observe(target);
  }
  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    observer.disconnect();
    for (const target of targets) target.classList.remove("will-reveal", "is-visible");
  });
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    const id = addButton.dataset.add;
    changeCart(setQuantity(cart, id, (cart[id] ?? 0) + 1), `${MENU[id].name} added to your order.`);
    openCart();
    return;
  }

  const increaseButton = event.target.closest("[data-increase]");
  if (increaseButton) {
    const id = increaseButton.dataset.increase;
    changeCart(setQuantity(cart, id, cart[id] + 1), `${MENU[id].name} quantity increased.`);
    return;
  }

  const decreaseButton = event.target.closest("[data-decrease]");
  if (decreaseButton) {
    const id = decreaseButton.dataset.decrease;
    changeCart(setQuantity(cart, id, cart[id] - 1), `${MENU[id].name} quantity decreased.`);
    return;
  }

  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    const id = removeButton.dataset.remove;
    changeCart(setQuantity(cart, id, 0), `${MENU[id].name} removed from your order.`);
  }
});

openButton.addEventListener("click", openCart);
closeButton.addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);
document.querySelector("#continue-browsing").addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (drawer.hidden) return;
  if (event.key === "Escape") closeCart();
  if (event.key !== "Tab") return;
  const focusable = [...drawer.querySelectorAll("button:not([disabled])")];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

renderCart();
setupScrollReveals();
