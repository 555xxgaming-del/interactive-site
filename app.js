const topics = [
  {
    name: 'World News',
    image: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?auto=format&fit=crop&w=1400&q=80',
    links: [
      ['Reuters World', 'https://www.reuters.com/world/'],
      ['AP World', 'https://apnews.com/world-news'],
      ['BBC World', 'https://www.bbc.com/news/world'],
      ['Al Jazeera', 'https://www.aljazeera.com/news/']
    ]
  },
  {
    name: 'US News',
    image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1400&q=80',
    links: [
      ['NPR', 'https://www.npr.org/sections/news/'],
      ['AP US', 'https://apnews.com/us-news'],
      ['CBS News', 'https://www.cbsnews.com/latest/'],
      ['ABC News', 'https://abcnews.go.com/US']
    ]
  },
  {
    name: 'Technology',
    image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80',
    links: [
      ['The Verge', 'https://www.theverge.com/tech'],
      ['Ars Technica', 'https://arstechnica.com/'],
      ['TechCrunch', 'https://techcrunch.com/'],
      ['Wired', 'https://www.wired.com/']
    ]
  },
  {
    name: 'Business & Markets',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=80',
    links: [
      ['Bloomberg Markets', 'https://www.bloomberg.com/markets'],
      ['CNBC', 'https://www.cnbc.com/world/?region=world'],
      ['Financial Times', 'https://www.ft.com/markets'],
      ['WSJ Markets', 'https://www.wsj.com/news/markets']
    ]
  },
  {
    name: 'Science & Climate',
    image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1400&q=80',
    links: [
      ['Nature News', 'https://www.nature.com/news'],
      ['ScienceDaily', 'https://www.sciencedaily.com/news/'],
      ['NOAA News', 'https://www.noaa.gov/news'],
      ['NASA News', 'https://www.nasa.gov/news/']
    ]
  },
  {
    name: 'Policy & Geopolitics',
    image: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1400&q=80',
    links: [
      ['Foreign Policy', 'https://foreignpolicy.com/'],
      ['Council on Foreign Relations', 'https://www.cfr.org/'],
      ['Brookings', 'https://www.brookings.edu/topic/international-affairs/'],
      ['CSIS', 'https://www.csis.org/']
    ]
  }
];

const cards = document.getElementById('cards');
const filter = document.getElementById('filter');
const clearBtn = document.getElementById('clear');
const now = document.getElementById('now');
const liveFeed = document.getElementById('liveFeed');
const uniqueCountEl = document.getElementById('uniqueCount');
const totalCountEl = document.getElementById('totalCount');

const COUNTER_NAMESPACE = 'levon-current-events-hub';
const UNIQUE_KEY = 'unique-visitors';
const TOTAL_KEY = 'total-visits';
const UNIQUE_SEEN_LOCAL_KEY = 'ceh_unique_seen_v1';

function render() {
  cards.innerHTML = '';
  const q = filter.value.trim().toLowerCase();

  for (const topic of topics) {
    const matchesTopic = topic.name.toLowerCase().includes(q);
    const filteredLinks = q
      ? topic.links.filter(([name]) => name.toLowerCase().includes(q))
      : topic.links;

    if (q && !matchesTopic && filteredLinks.length === 0) continue;

    const article = document.createElement('article');
    article.className = 'card topic';
    article.style.setProperty('--topic-image', `url('${topic.image}')`);

    const h2 = document.createElement('h2');
    h2.textContent = topic.name;

    const ul = document.createElement('ul');
    for (const [name, url] of filteredLinks) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = name;
      li.appendChild(a);
      ul.appendChild(li);
    }

    article.append(h2, ul);
    cards.appendChild(article);
  }
}

function tick() {
  const d = new Date();
  now.textContent = `Local time: ${d.toLocaleString()}`;
}

filter.addEventListener('input', render);
clearBtn.addEventListener('click', () => { filter.value = ''; render(); });

async function loadLiveFeed() {
  try {
    const res = await fetch('dynamic-headlines.json?ts=' + Date.now());
    if (!res.ok) throw new Error('feed unavailable');
    const data = await res.json();
    const items = (data.items || []).slice(0, 12);
    if (!items.length) {
      liveFeed.innerHTML = '<li>No live matches yet. Run crawler to refresh.</li>';
      return;
    }
    liveFeed.innerHTML = '';
    for (const item of items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = item.title;
      const source = document.createElement('small');
      source.style.marginLeft = '.5rem';
      source.style.opacity = '0.8';
      source.textContent = item.source ? `(${item.source})` : '';
      li.append(a, source);
      liveFeed.appendChild(li);
    }
  } catch {
    liveFeed.innerHTML = '<li>Live feed unavailable. Run crawler script and push update.</li>';
  }
}

async function callCountApi(path) {
  const url = `https://api.countapi.xyz${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CountAPI ${res.status}`);
  return res.json();
}

async function updateCounters() {
  try {
    // Total visits increments every page load.
    const total = await callCountApi(`/hit/${COUNTER_NAMESPACE}/${TOTAL_KEY}`);
    totalCountEl.textContent = Number(total.value || 0).toLocaleString();

    // Unique increments once per browser profile (simple client-side uniqueness).
    const seenUnique = localStorage.getItem(UNIQUE_SEEN_LOCAL_KEY) === '1';
    if (!seenUnique) {
      const uniq = await callCountApi(`/hit/${COUNTER_NAMESPACE}/${UNIQUE_KEY}`);
      uniqueCountEl.textContent = Number(uniq.value || 0).toLocaleString();
      localStorage.setItem(UNIQUE_SEEN_LOCAL_KEY, '1');
    } else {
      const uniq = await callCountApi(`/get/${COUNTER_NAMESPACE}/${UNIQUE_KEY}`);
      uniqueCountEl.textContent = Number(uniq.value || 0).toLocaleString();
    }
  } catch {
    uniqueCountEl.textContent = 'n/a';
    totalCountEl.textContent = 'n/a';
  }
}

render();
tick();
setInterval(tick, 1000);
loadLiveFeed();
updateCounters();
