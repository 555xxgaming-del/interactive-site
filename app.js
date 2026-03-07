const topics = [
  {
    name: 'World News',
    image: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?auto=format&fit=crop&w=1400&q=80',
    tags: ['world', 'global', 'international', 'war', 'conflict', 'geopolitics']
  },
  {
    name: 'US News',
    image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1400&q=80',
    tags: ['us', 'u.s.', 'america', 'american', 'washington']
  },
  {
    name: 'Technology',
    image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80',
    tags: ['tech', 'ai', 'software', 'chip', 'cyber', 'data center']
  },
  {
    name: 'Business & Markets',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=80',
    tags: ['market', 'stocks', 'finance', 'trading', 'economy', 'price', 'oil', 'lng', 'gas', 'energy']
  },
  {
    name: 'Science & Climate',
    image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1400&q=80',
    tags: ['science', 'climate', 'weather', 'nasa', 'noaa', 'research']
  },
  {
    name: 'Policy & Geopolitics',
    image: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1400&q=80',
    tags: ['policy', 'sanctions', 'ofac', 'geopolitics', 'diplomacy', 'security', 'shipping']
  }
];

const cards = document.getElementById('cards');
const filter = document.getElementById('filter');
const clearBtn = document.getElementById('clear');
const now = document.getElementById('now');
const liveFeed = document.getElementById('liveFeed');
const trendingSubjectsEl = document.getElementById('trendingSubjects');
const uniqueCountEl = document.getElementById('uniqueCount');
const totalCountEl = document.getElementById('totalCount');

const COUNTER_NAMESPACE = 'levon-current-events-hub';
const UNIQUE_KEY = 'unique-visitors';
const TOTAL_KEY = 'total-visits';
const UNIQUE_SEEN_LOCAL_KEY = 'ceh_unique_seen_v1';

let feedData = { items: [], trendingSubjects: [] };

function tick() {
  const d = new Date();
  now.textContent = `Local time: ${d.toLocaleString()}`;
}

function storiesForTopic(topic, items) {
  return items.filter((item) => {
    const text = `${item.title} ${item.source || ''}`.toLowerCase();
    return topic.tags.some((tag) => text.includes(tag.toLowerCase()));
  });
}

function renderTopicCards() {
  cards.innerHTML = '';
  const q = filter.value.trim().toLowerCase();
  const items = feedData.items || [];

  for (const topic of topics) {
    const stories = storiesForTopic(topic, items).slice(0, 6);
    const matchesTopic = topic.name.toLowerCase().includes(q);
    const filteredStories = q
      ? stories.filter((s) => s.title.toLowerCase().includes(q) || (s.source || '').toLowerCase().includes(q))
      : stories;

    if (q && !matchesTopic && filteredStories.length === 0) continue;

    const article = document.createElement('article');
    article.className = 'card topic';
    article.style.setProperty('--topic-image', `url('${topic.image}')`);

    const h2 = document.createElement('h2');
    h2.textContent = topic.name;

    const ul = document.createElement('ul');
    const list = filteredStories.length ? filteredStories : [];

    if (!list.length) {
      const li = document.createElement('li');
      li.textContent = 'No high-priority stories matched yet.';
      ul.appendChild(li);
    } else {
      for (const story of list) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = story.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = story.title;

        const source = document.createElement('small');
        source.style.marginLeft = '.45rem';
        source.style.opacity = '0.82';
        source.textContent = story.source ? `(${story.source})` : '';

        li.append(a, source);
        ul.appendChild(li);
      }
    }

    article.append(h2, ul);
    cards.appendChild(article);
  }
}

async function loadLiveFeed() {
  try {
    const res = await fetch('dynamic-headlines.json?ts=' + Date.now());
    if (!res.ok) throw new Error('feed unavailable');
    const data = await res.json();
    feedData = data;

    const items = (data.items || []).slice(0, 12);
    if (!items.length) {
      liveFeed.innerHTML = '<li>No live matches yet. Run crawler to refresh.</li>';
    } else {
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
    }

    const trends = (data.trendingSubjects || []).slice(0, 8);
    if (!trends.length) {
      trendingSubjectsEl.innerHTML = '<li>No trending subjects yet.</li>';
    } else {
      trendingSubjectsEl.innerHTML = '';
      for (const t of trends) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${t.keyword}</strong> — score ${Number(t.tractionScore).toFixed(2)} · mentions ${t.mentions} · sources ${t.sourceDiversity}`;
        trendingSubjectsEl.appendChild(li);
      }
    }

    renderTopicCards();
  } catch {
    liveFeed.innerHTML = '<li>Live feed unavailable. Run crawler script and push update.</li>';
    trendingSubjectsEl.innerHTML = '<li>Trending subjects unavailable.</li>';
    renderTopicCards();
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
    const total = await callCountApi(`/hit/${COUNTER_NAMESPACE}/${TOTAL_KEY}`);
    totalCountEl.textContent = Number(total.value || 0).toLocaleString();

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

filter.addEventListener('input', renderTopicCards);
clearBtn.addEventListener('click', () => {
  filter.value = '';
  renderTopicCards();
});

tick();
setInterval(tick, 1000);
renderTopicCards();
loadLiveFeed();
updateCounters();
