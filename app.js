/* Sawubona - tap to listen, identify the language, say hello. */
(() => {
  const LISTEN_SECONDS = 5;
  const TARGET_SR = 16000;

  const $ = (id) => document.getElementById(id);
  const screens = { listen: $("screen-listen"), result: $("screen-result"), browse: $("screen-browse") };
  const listenBtn = $("listen-btn");
  const orbLabel = $("orb-label");
  const hint = $("hint");
  const banner = $("status-banner");
  const progress = $("progress");
  const meterBars = Array.from($("meter").children);

  let serverState = "loading";
  let busy = false;
  let voices = [];

  // ------------------------------------------------------------------ //
  // Server status (model loading takes a while on first run)
  // ------------------------------------------------------------------ //
  async function pollStatus() {
    try {
      const r = await fetch("/api/status");
      const s = await r.json();
      serverState = s.state;
      banner.classList.remove("hidden", "error");
      if (s.state === "loading") {
        banner.textContent = "Warming up the language model… (first run downloads ~3.8 GB)";
        setTimeout(pollStatus, 2500);
      } else if (s.state === "error") {
        banner.classList.add("error");
        banner.textContent = "The model failed to load. Check the server log. " + (s.error || "");
      } else if (s.state === "demo") {
        banner.textContent = "Demo mode: the language is picked at random so you can try the flow.";
      } else {
        banner.classList.add("hidden");
      }
    } catch {
      banner.classList.remove("hidden");
      banner.classList.add("error");
      banner.textContent = "Can't reach the server. Is server.py running?";
      setTimeout(pollStatus, 3000);
    }
  }

  // ------------------------------------------------------------------ //
  // Audio capture -> mono 16 kHz WAV
  // ------------------------------------------------------------------ //
  function setProgress(fraction) {
    progress.style.setProperty("--p", `${Math.min(100, fraction * 100)}%`);
  }

  function setMeter(level) {
    const scaled = Math.min(1, level * 12);
    meterBars.forEach((bar, i) => {
      const centre = (meterBars.length - 1) / 2;
      const falloff = 1 - Math.abs(i - centre) / (centre + 1.5);
      const h = 6 + scaled * 30 * falloff * (0.75 + Math.random() * 0.5);
      bar.style.height = `${h}px`;
    });
  }

  async function recordClip(seconds) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const chunks = [];

    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      setMeter(Math.sqrt(sum / data.length));
    };
    source.connect(processor);
    processor.connect(ctx.destination);

    const start = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        setProgress(elapsed / seconds);
        orbLabel.textContent = `${Math.max(0, Math.ceil(seconds - elapsed))}`;
        if (elapsed >= seconds) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });

    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    const rate = ctx.sampleRate;
    await ctx.close();

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) { pcm.set(c, offset); offset += c.length; }
    return { pcm, rate };
  }

  async function resample(pcm, fromRate, toRate) {
    if (fromRate === toRate) return pcm;
    const frames = Math.round((pcm.length * toRate) / fromRate);
    const offline = new OfflineAudioContext(1, frames, toRate);
    const buffer = offline.createBuffer(1, pcm.length, fromRate);
    buffer.copyToChannel(pcm, 0);
    const src = offline.createBufferSource();
    src.buffer = buffer;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }

  function encodeWav(pcm, rate) {
    const bytes = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(bytes);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE");
    str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, pcm.length * 2, true);
    let o = 44;
    for (let i = 0; i < pcm.length; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([bytes], { type: "audio/wav" });
  }

  // ------------------------------------------------------------------ //
  // Main flow
  // ------------------------------------------------------------------ //
  function setPhase(phase, label, hintText) {
    screens.listen.classList.remove("listening", "thinking");
    if (phase) screens.listen.classList.add(phase);
    orbLabel.textContent = label;
    hint.classList.remove("error");
    hint.textContent = hintText;
  }

  async function listen() {
    if (busy) return;
    if (serverState === "loading") {
      hint.textContent = "One moment, the language model is still warming up…";
      return;
    }
    busy = true;
    listenBtn.disabled = true;
    try {
      setPhase("listening", "Listening", "Listening… let them speak naturally.");
      setProgress(0);
      const { pcm, rate } = await recordClip(LISTEN_SECONDS);

      setPhase("thinking", "Thinking", "Hmm, which language is that…");
      const pcm16k = await resample(pcm, rate, TARGET_SR);
      const wav = encodeWav(pcm16k, TARGET_SR);

      const form = new FormData();
      form.append("audio", wav, "clip.wav");
      const res = await fetch("/api/identify", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Server error " + res.status);
      }
      const data = await res.json();
      if (data.silent) {
        setPhase(null, "Tap to listen", "I couldn't hear anyone speaking. Get a little closer and try again.");
        hint.classList.add("error");
        return;
      }
      showResult(data);
      setPhase(null, "Tap to listen", "Hold the phone near someone speaking. I'll listen for five seconds.");
    } catch (err) {
      console.error(err);
      const msg = err.name === "NotAllowedError"
        ? "Microphone access was blocked. Allow it in the browser and try again."
        : err.message || "Something went wrong.";
      setPhase(null, "Tap to listen", msg);
      hint.classList.add("error");
    } finally {
      busy = false;
      listenBtn.disabled = false;
      setProgress(0);
    }
  }

  // ------------------------------------------------------------------ //
  // Result rendering
  // ------------------------------------------------------------------ //
  function show(screen) {
    Object.values(screens).forEach((s) => s.classList.add("hidden"));
    screens[screen].classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function pct(x) { return Math.round(x * 100) + "%"; }

  // Emoji flags don't render on Windows, so use an image with a badge fallback.
  function flagHTML(lang) {
    const cc = lang && lang.country;
    const badge = `<span class="flag-badge">${cc ? cc.toUpperCase() : "🌍"}</span>`;
    if (!cc) return badge;
    return `<img class="flag-img" src="https://flagcdn.com/w80/${cc}.png" alt="" `
      + `onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'flag-badge',textContent:'${cc.toUpperCase()}'}))">`;
  }

  function showResult(data) {
    const top = data.results[0];
    const lang = data.match;
    const low = top.score < 0.5;

    $("result-eyebrow").textContent = low ? "I think you're hearing" : "You're hearing";
    $("result-flag").innerHTML = flagHTML(lang);
    $("result-name").textContent = lang ? lang.name : top.name;
    $("result-english").textContent = lang && lang.name !== lang.english_name ? lang.english_name : "";
    $("result-region").textContent = lang ? lang.region : "";

    const conf = $("confidence");
    conf.classList.toggle("low", low);
    conf.innerHTML = `<span>${pct(top.score)} sure</span><div class="bar"><i></i></div>`;
    requestAnimationFrame(() => { conf.querySelector("i").style.width = pct(top.score); });

    const alts = data.results.slice(1).filter((r) => r.score >= 0.05);
    $("alternatives").textContent = alts.length
      ? "Could also be " + alts.map((r) => `${r.name} (${pct(r.score)})`).join(" or ")
      : "";

    renderPhrasebook(lang, top);
    show("result");
  }

  function renderPhrasebook(lang, top) {
    const about = $("about");
    const tipBox = $("sound-tip");
    const list = $("phrases");
    list.innerHTML = "";

    if (!lang) {
      about.textContent = `I recognised ${top ? top.name : "this language"} but don't have a phrasebook for it yet. A smile and a wave still work in every language.`;
      tipBox.classList.add("hidden");
      return;
    }

    about.textContent = lang.about || "";
    tipBox.textContent = lang.sound_tip || "";
    tipBox.classList.toggle("hidden", !lang.sound_tip);

    const voice = findVoice(lang.bcp47);
    const tpl = $("phrase-tpl");
    lang.phrases.forEach((p, i) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.style.animationDelay = `${i * 60}ms`;
      node.querySelector(".phrase-en").textContent = p.en;
      node.querySelector(".phrase-text").textContent = p.text;
      node.querySelector(".phrase-roman").textContent = p.roman || "";
      node.querySelector(".phrase-say").textContent = p.say;
      node.querySelector(".phrase-tip").textContent = p.tip || "";
      const speak = node.querySelector(".speak");
      if (voice) {
        speak.addEventListener("click", () => {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(p.text.replace(/\s*\(.*?\)\s*/g, " "));
          u.voice = voice;
          u.lang = voice.lang;
          u.rate = 0.85;
          speechSynthesis.speak(u);
        });
      } else {
        speak.classList.add("hidden");
      }
      list.appendChild(node);
    });
  }

  function findVoice(bcp47) {
    if (!("speechSynthesis" in window) || !bcp47) return null;
    const want = bcp47.toLowerCase();
    const prefix = want.split("-")[0];
    return voices.find((v) => v.lang.toLowerCase() === want)
        || voices.find((v) => v.lang.toLowerCase().split("-")[0] === prefix)
        || null;
  }

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    voices = speechSynthesis.getVoices();
  }

  // ------------------------------------------------------------------ //
  // Browse screen
  // ------------------------------------------------------------------ //
  const GROUPS = [
    ["south-africa", "South Africa's official languages"],
    ["southern-africa", "Neighbours & the wider region"],
    ["world", "Further afield"],
  ];

  async function openBrowse() {
    const r = await fetch("/api/languages");
    const { languages } = await r.json();
    const container = $("browse-list");
    container.innerHTML = "";
    for (const [key, title] of GROUPS) {
      const items = languages.filter((l) => l.group === key);
      if (!items.length) continue;
      const h = document.createElement("h3");
      h.className = "group-title";
      h.textContent = title;
      container.appendChild(h);
      const list = document.createElement("div");
      list.className = "lang-list";
      for (const l of items) {
        const btn = document.createElement("button");
        btn.className = "lang-item";
        btn.innerHTML = `<span class="flag">${flagHTML(l)}</span><span><b>${l.name}</b><small>${l.english_name} · ${l.region}</small></span>`
          + (l.supported ? "" : `<span class="badge">not in model</span>`);
        btn.addEventListener("click", () => openLanguage(l.code));
        list.appendChild(btn);
      }
      container.appendChild(list);
    }
    show("browse");
  }

  async function openLanguage(code) {
    const r = await fetch(`/api/languages/${code}`);
    const lang = await r.json();
    $("result-eyebrow").textContent = "Phrasebook";
    $("result-flag").innerHTML = flagHTML(lang);
    $("result-name").textContent = lang.name;
    $("result-english").textContent = lang.name !== lang.english_name ? lang.english_name : "";
    $("result-region").textContent = lang.region;
    $("confidence").innerHTML = "";
    $("alternatives").textContent = "";
    renderPhrasebook(lang, null);
    show("result");
  }

  // ------------------------------------------------------------------ //
  // Wire up
  // ------------------------------------------------------------------ //
  listenBtn.addEventListener("click", listen);
  $("again-btn").addEventListener("click", () => { show("listen"); listen(); });
  $("back-btn").addEventListener("click", () => show("listen"));
  $("browse-btn").addEventListener("click", openBrowse);
  $("browse-back-btn").addEventListener("click", () => show("listen"));

  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    hint.textContent = "This browser can't access the microphone. Open the app over http://localhost or https.";
    hint.classList.add("error");
  }
  pollStatus();
})();
