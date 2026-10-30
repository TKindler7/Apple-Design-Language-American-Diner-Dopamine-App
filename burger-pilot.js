import { ITEM_BY_ID, defaultOptions, normalizeOptions, itemPrice } from "./catalog.js";
import { PILOT_ITEM_ID } from "./burger-pilot-model.js";
import { createBurgerPilotScene } from "./burger-pilot-scene.js";

const item = ITEM_BY_ID[PILOT_ITEM_ID];
const form = document.querySelector("#pilot-options");
const stage = document.querySelector("#pilot-stage");
const status = document.querySelector("#pilot-status");
const buttons = [...document.querySelectorAll("[data-view]")];
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
let options = defaultOptions(PILOT_ITEM_ID), viewer = null, closed = false, lifecycle = 0;

function showOptions() {
  form.replaceChildren();
  for (const group of item.options) {
    const fieldset = document.createElement("fieldset"), legend = document.createElement("legend"), choices = document.createElement("div");
    legend.textContent = group.label; choices.className = "choices";
    fieldset.append(legend, choices);
    for (const choice of group.choices) {
      const label = document.createElement("label"), input = document.createElement("input"), text = document.createElement("span");
      label.className = "choice"; input.type = group.type === "multiple" ? "checkbox" : "radio";
      input.name = group.id; input.value = choice.id;
      input.checked = group.type === "multiple" ? options[group.id].includes(choice.id) : options[group.id] === choice.id;
      text.textContent = choice.label; label.append(input, text);
      if (choice.price) { const price = document.createElement("span"); price.className = "choice-price"; price.textContent = `+${money(choice.price)}`; label.append(price); }
      choices.append(label);
    }
    form.append(fieldset);
  }
  document.querySelector("#pilot-price").textContent = money(itemPrice(PILOT_ITEM_ID, options));
}
function readOptions() {
  const data = new FormData(form);
  options = normalizeOptions(PILOT_ITEM_ID, Object.fromEntries(item.options.map(group => [group.id, group.type === "multiple" ? data.getAll(group.id) : data.get(group.id)])));
  document.querySelector("#pilot-price").textContent = money(itemPrice(PILOT_ITEM_ID, options));
  viewer?.update(options);
}
function onState(state) {
  stage.closest(".stage-wrap").classList.toggle("is-ready", state.ready);
  stage.setAttribute("aria-hidden", String(!state.ready));
  stage.setAttribute("aria-busy", String(Boolean(state.loading)));
  const canvas = stage.querySelector("canvas"); if (canvas) canvas.tabIndex = state.ready ? 0 : -1;
  status.textContent = state.message;
  for (const button of buttons) button.disabled = !state.ready;
}
showOptions();
form.addEventListener("change", readOptions);
document.querySelector("#pilot-defaults").addEventListener("click", () => { options = defaultOptions(PILOT_ITEM_ID); showOptions(); viewer?.update(options); });
for (const button of buttons) button.addEventListener("click", () => {
  const actions = { left: () => viewer.rotate(-.35), right: () => viewer.rotate(.35), in: () => viewer.zoom(.5), out: () => viewer.zoom(-.5), reset: () => viewer.reset(), assemble: () => viewer.assemble() };
  actions[button.dataset.view]?.();
});
async function startViewer() {
  const generation = ++lifecycle;
  onState({ ready: false, loading: true, message: "Preparing the ingredient preview. The image shows the original recipe." });
  try {
    const created = await createBurgerPilotScene(stage, { onState: state => {
      if (!closed && generation === lifecycle) onState(state);
    } });
    if (closed || generation !== lifecycle) { created.dispose(); return; }
    viewer = created;
    await viewer.update(options);
  } catch (error) {
    if (!closed && generation === lifecycle) onState({ ready: false, message: `${error.message} The original recipe image is shown; it does not reflect your ingredient selections.` });
  }
}
window.addEventListener("pagehide", () => { closed = true; lifecycle++; viewer?.dispose(); viewer = null; });
window.addEventListener("pageshow", event => { if (event.persisted) { closed = false; startViewer(); } });
await startViewer();
