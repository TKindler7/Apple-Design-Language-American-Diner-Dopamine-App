import { MENU, countItems, loadCart, saveCart, setQuantity, totalPrice } from "./cart.js";

const drawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#cart-backdrop");
const openButton = document.querySelector("#open-cart");
const closeButton = document.querySelector("#close-cart");
const itemsElement = document.querySelector("#cart-items");
const announcement = document.querySelector("#cart-announcement");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

let cart = loadCart(window.localStorage);
let focusBeforeDrawer = null;

function renderCart() {
  const count = countItems(cart);
  document.querySelector("#bag-count").textContent = count;
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
  focusBeforeDrawer = document.activeElement;
  backdrop.hidden = false;
  drawer.hidden = false;
  document.body.classList.add("cart-open");
  closeButton.focus();
}

function closeCart() {
  backdrop.hidden = true;
  drawer.hidden = true;
  document.body.classList.remove("cart-open");
  focusBeforeDrawer?.focus();
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
