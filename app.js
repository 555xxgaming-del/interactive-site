const countEl = document.getElementById('count');
const todosEl = document.getElementById('todos');
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const nameInput = document.getElementById('name');
const hello = document.getElementById('hello');
const accentInput = document.getElementById('accent');
const cat = document.getElementById('cat');
const catToggle = document.getElementById('catToggle');
const catSpeed = document.getElementById('catSpeed');

let count = Number(localStorage.getItem('count') || 0);
let todos = JSON.parse(localStorage.getItem('todos') || '[]');

function save() {
  localStorage.setItem('count', String(count));
  localStorage.setItem('todos', JSON.stringify(todos));
}

function renderCount() { countEl.textContent = count; }
function renderTodos() {
  todosEl.innerHTML = '';
  todos.forEach((t, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = 'Done';
    btn.onclick = () => { todos.splice(i, 1); save(); renderTodos(); };
    li.textContent = t + ' ';
    li.appendChild(btn);
    todosEl.appendChild(li);
  });
}

document.getElementById('inc').onclick = () => { count++; save(); renderCount(); };
document.getElementById('dec').onclick = () => { count--; save(); renderCount(); };
document.getElementById('reset').onclick = () => { count = 0; save(); renderCount(); };

document.getElementById('theme').onclick = () => {
  document.body.classList.toggle('light');
};

accentInput.oninput = (e) => {
  document.documentElement.style.setProperty('--accent', e.target.value);
};

todoForm.onsubmit = (e) => {
  e.preventDefault();
  const v = todoInput.value.trim();
  if (!v) return;
  todos.push(v);
  todoInput.value = '';
  save();
  renderTodos();
};

nameInput.oninput = (e) => {
  const n = e.target.value.trim();
  hello.textContent = n ? `Hey ${n}, welcome to your interactive site.` : 'Hey there.';
};

renderCount();
renderTodos();

let catIsDancing = false;

function setCatSpeed() {
  const speed = Number(catSpeed.value || 1);
  cat.style.animationDuration = `${Math.max(0.2, 0.7 / speed)}s`;
}

catToggle.onclick = () => {
  catIsDancing = !catIsDancing;
  cat.classList.toggle('dancing', catIsDancing);
  catToggle.textContent = catIsDancing ? 'Stop Dance' : 'Start Dance';
  cat.textContent = catIsDancing ? '😸' : '🐱';
};

catSpeed.oninput = setCatSpeed;
setCatSpeed();
