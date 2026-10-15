/* ==========================================================
   LE MINI-JEU DU PENALTY
   Utilisé par les quatre scènes « chapitre2-fifa-peno-*.html ».
   Le joueur clique dans le but pour tirer ; le gardien part
   au hasard dans l'une des trois zones (gauche / centre / droite).
   ========================================================== */

(function () {
    const cv = document.getElementById('c');
    if (!cv) return; // la page n'a pas le jeu : on ne fait rien
    const ctx = cv.getContext('2d');

    /* Le terrain est dessiné dans un repère fixe de 480 x 600.
       SCALE l'agrandit à l'affichage : on ne touche donc à aucune
       coordonnée du dessin ni du calcul du but et du gardien. */
    const DW = 480, DH = 600;
    const W = 800, H = 1000;                      // taille réelle du canvas
    const SCALE = W / DW;                         // agrandissement (ici 5/3)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    cv.width = W * dpr;
    cv.height = H * dpr;

    /* --- Géométrie de la scène --- */
    const G = { x: 100, y: 110, w: 280, h: 110 };   // le but
    const SPOT = { x: 240, y: 410 };                  // le point de penalty
    const P0 = { x: 150, y: 535 };                    // départ du tireur
    const KICK = { x: 212, y: 432 };                  // position au moment du tir
    const KB = G.y + G.h - 46;                       // ligne du gardien

    const RUN = .8, LAUNCH = RUN + .16, FLIGHT = .5;

    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

    /* ---------- Les couleurs de chaque équipe ----------
       Chaque page indique son équipe avec <canvas data-team="...">.
       Teinte : la couleur de peau ; Maillot / Short / Chiffre : le
       tenue du tireur ; Gardien : la tenue du gardien adverse. */
    const EQUIPES = {
        'real-madrid': {
            peau: '#7a4a24', cheveux: '#1b1410',
            maillot: '#fdfdfd', short: '#1b3a8f', chiffre: '#1b3a8f',
            gardien: { maillot: '#12307a', short: '#fdfdfd', gants: '#d9ff4a' }
        },
        'bayern': {
            peau: '#f0c8a0', cheveux: '#c9a227',
            maillot: '#dc1436', short: '#dc1436', chiffre: '#ffffff',
            gardien: { maillot: '#101820', short: '#101820', gants: '#00d4ff' }
        },
        'chelsea': {
            peau: '#8c5a3b', cheveux: '#1a1008',
            maillot: '#034694', short: '#034694', chiffre: '#ffffff',
            gardien: { maillot: '#c8a951', short: '#1b1b1b', gants: '#e8e8ee' }
        },
        'ol': {
            peau: '#f2d0b0', cheveux: '#5a3820',
            maillot: '#fdfdfd', short: '#fdfdfd', chiffre: '#d2263a',
            gardien: { maillot: '#8a1538', short: '#8a1538', gants: '#f2f2f2' }
        }
    };

    const equipe = EQUIPES[cv.dataset.team] || EQUIPES['real-madrid'];
    const G_ = equipe.gardien;   // couleurs du gardien

    /* ---------- Terrain (dessiné une seule fois) ---------- */
    const pitch = document.createElement('canvas');
    pitch.width = DW * dpr;
    pitch.height = DH * dpr;

    (function buildPitch() {
        const p = pitch.getContext('2d');
        p.scale(dpr, dpr);

        for (let y = 0, i = 0; y < DH; y += 46, i++) {
            p.fillStyle = i % 2 ? '#2a7637' : '#31853f';
            p.fillRect(0, y, DW, 46);
        }
        for (let i = 0; i < 2600; i++) {
            p.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)';
            p.fillRect(Math.random() * DW, Math.random() * DH, 1.5, 3);
        }
        let g = p.createLinearGradient(0, 0, 0, DH);
        g.addColorStop(0, 'rgba(0,0,0,.35)');
        g.addColorStop(.45, 'rgba(0,0,0,0)');
        p.fillStyle = g;
        p.fillRect(0, 0, DW, DH);

        // Tribunes + panneau publicitaire derrière le but
        g = p.createLinearGradient(0, 0, 0, 84);
        g.addColorStop(0, '#0a0e13');
        g.addColorStop(1, '#151d27');
        p.fillStyle = g;
        p.fillRect(0, 0, DW, 84);
        for (let i = 0; i < 260; i++) {
            p.fillStyle = `rgba(${120 + Math.random() * 100 | 0},${120 + Math.random() * 100 | 0},${140 + Math.random() * 100 | 0},.18)`;
            p.fillRect(Math.random() * DW, Math.random() * 76, 2, 2);
        }
        p.fillStyle = '#1f2b3a';
        p.fillRect(0, 84, DW, 16);
        for (let x = 0; x < DW; x += 60) {
            p.fillStyle = x / 60 % 2 ? '#2b3d54' : '#22324a';
            p.fillRect(x, 84, 60, 16);
        }

        // Lignes du terrain
        p.strokeStyle = 'rgba(255,255,255,.88)';
        p.lineWidth = 3;
        p.lineCap = 'round';
        const L = (x1, y1, x2, y2) => {
            p.beginPath();
            p.moveTo(x1, y1);
            p.lineTo(x2, y2);
            p.stroke();
        };
        L(0, 220, DW, 220);
        p.beginPath();
        p.moveTo(60, 220);
        p.lineTo(60, 272);
        p.lineTo(420, 272);
        p.lineTo(420, 220);
        p.stroke();
        p.beginPath();
        p.moveTo(8, 220);
        p.lineTo(8, 478);
        p.lineTo(472, 478);
        p.lineTo(472, 220);
        p.stroke();
        const a = Math.asin((478 - SPOT.y) / 84);
        p.beginPath();
        p.arc(SPOT.x, SPOT.y, 84, a, Math.PI - a);
        p.stroke();
        p.fillStyle = '#fff';
        p.beginPath();
        p.arc(SPOT.x, SPOT.y, 4, 0, 7);
        p.fill();

        g = p.createRadialGradient(DW / 2, DH / 2, DH * .35, DW / 2, DH / 2, DH * .8);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,.45)');
        p.fillStyle = g;
        p.fillRect(0, 0, DW, DH);
    })();

    /* ---------- État du jeu ---------- */
    const S = {
        p: { x: P0.x, y: P0.y, run: 0, kick: -1 },
        k: { x: 240, y: KB, ang: 0, reach: 0 },
        b: { x: SPOT.x, y: SPOT.y, r: 11, spin: 0 },
        fx: []
    };

    let mode = 'idle';
    let t0 = 0, T = null, tDone = 0, tBack = 0, snap = null;
    let goals = 0, shots = 0, aim = null, bEnd = null;

    const $ = id => document.getElementById(id);
    const over = $('over'), res = $('res'), hint = $('hint'), suivant = $('suivant');

    /* ---------- Dessin ---------- */
    function drawGoalBack() {
        const x0 = G.x, x1 = G.x + G.w, y0 = G.y, y1 = G.y + G.h;
        const nx0 = x0 + 20, nx1 = x1 - 20, ny0 = y0 + 14, ny1 = y1 - 8;
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0, y1);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = nx0; x <= nx1; x += 13) { ctx.moveTo(x, ny0); ctx.lineTo(x, ny1); }
        for (let y = ny0; y <= ny1; y += 11) { ctx.moveTo(nx0, y); ctx.lineTo(nx1, y); }
        ctx.stroke();
    }

    function drawGoalFront() {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0,0,0,.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.strokeStyle = '#f5f7fa';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(G.x, G.y + G.h);
        ctx.lineTo(G.x, G.y);
        ctx.lineTo(G.x + G.w, G.y);
        ctx.lineTo(G.x + G.w, G.y + G.h);
        ctx.stroke();
        ctx.restore();
    }

    function drawBall(b) {
        const { x, y, r, spin } = b;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 7);
        const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r);
        g.addColorStop(0, '#fff');
        g.addColorStop(1, '#c4cad2');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.clip();
        ctx.rotate(spin);
        ctx.fillStyle = '#1b1f26';
        ctx.strokeStyle = '#1b1f26';
        ctx.lineWidth = Math.max(.6, r * .07);
        const pent = (cx, cy, pr, rot) => {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = rot + i * Math.PI * 2 / 5;
                ctx.lineTo(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr);
            }
            ctx.closePath();
            ctx.fill();
        };
        pent(0, 0, r * .4, -Math.PI / 2);
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * .4, Math.sin(a) * r * .4);
            ctx.lineTo(Math.cos(a) * r * .75, Math.sin(a) * r * .75);
            ctx.stroke();
            pent(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, r * .34, a + Math.PI / 2);
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 7);
        ctx.stroke();
    }

    function limb(x1, y1, x2, y2, w, c) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function drawPlayer(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 20, 6, 0, 0, 7);
        ctx.fill();

        const s = Math.sin(p.run);
        let lf = [-8, -Math.max(0, s) * 12];
        let rf = [8, -Math.max(0, -s) * 12];
        if (p.kick >= 0) {
            lf = [-9, 0];
            const kp = p.kick;
            if (kp < .45) {
                const w = kp / .45;
                rf = [10 + 2 * w, -10 * w];
            } else {
                const sw = (kp - .45) / .55;
                rf = [12 + 16 * sw, -10 - 12 * sw];
            }
        }
        [[-7, lf], [7, rf]].forEach(([hx, f]) => {
            limb(hx, -36, f[0], f[1] - 4, 7.5, equipe.peau);
            limb(lerp(hx, f[0], .5), lerp(-36, f[1] - 4, .5), f[0], f[1] - 4, 8, equipe.short);
            ctx.fillStyle = '#14171c';
            ctx.beginPath();
            ctx.ellipse(f[0], f[1], 7, 4.5, 0, 0, 7);
            ctx.fill();
        });

        const kick = p.kick >= 0;
        const lh = kick ? [-27, -58] : [-23, -52 + s * 6];
        const rh = kick ? [25, -64] : [23, -52 - s * 6];
        limb(-14, -72, lh[0], lh[1], 6, equipe.peau);
        limb(14, -72, rh[0], rh[1], 6, equipe.peau);

        ctx.fillStyle = equipe.maillot;
        ctx.beginPath();
        ctx.roundRect(-14, -48, 28, 16, 4);
        ctx.fill();

        ctx.fillStyle = equipe.maillot;
        ctx.beginPath();
        ctx.roundRect(-15, -78, 30, 33, 6);
        ctx.fill();
        ctx.fillStyle = equipe.chiffre;
        ctx.font = 'bold 15px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('10', 0, -56);
        ctx.fillStyle = equipe.peau;
        ctx.fillRect(-3, -83, 6, 6);
        ctx.fillStyle = equipe.cheveux;
        ctx.beginPath();
        ctx.arc(0, -89, 9, 0, 7);
        ctx.fill();
        ctx.restore();
    }

    function drawKeeper(k) {
        ctx.fillStyle = 'rgba(0,0,0,' + (.35 - .15 * k.reach) + ')';
        ctx.beginPath();
        ctx.ellipse(k.x, G.y + G.h + 2, 22 - 6 * k.reach, 6, 0, 0, 7);
        ctx.fill();

        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.ang);
        const r = k.reach;

        [-1, 1].forEach(sx => {
            limb(sx * 7, 18, sx * (10 + 7 * r), 44, 8, '#e9c9a6');
            limb(sx * (8.5 + 3.5 * r), 31, sx * (10 + 7 * r), 44, 9, G_.short);
            ctx.fillStyle = G_.gants;
            ctx.beginPath();
            ctx.ellipse(sx * (10 + 7 * r), 46, 7, 4.5, 0, 0, 7);
            ctx.fill();
        });

        ctx.fillStyle = G_.short;
        ctx.beginPath();
        ctx.roundRect(-14, 4, 28, 17, 4);
        ctx.fill();

        [-1, 1].forEach(sx => {
            const hx = sx * lerp(27, 16, r);
            const hy = lerp(4, -70, r);
            limb(sx * 15, -27, hx, hy, 8, G_.maillot);
            ctx.fillStyle = G_.gants;
            ctx.beginPath();
            ctx.arc(hx, hy, 6, 0, 7);
            ctx.fill();
        });

        ctx.fillStyle = G_.maillot;
        ctx.beginPath();
        ctx.roundRect(-16, -32, 32, 38, 7);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.fillRect(-16, -6, 32, 5);
        ctx.fillStyle = '#e9c9a6';
        ctx.beginPath();
        ctx.arc(0, -42, 9, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#2b1d14';
        ctx.beginPath();
        ctx.arc(0, -45, 9, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.fillRect(-4, -42, 2, 2);
        ctx.fillRect(2, -42, 2, 2);
        ctx.restore();
    }

    function drawFx(now) {
        S.fx = S.fx.filter(f => now - f.t < .8);
        S.fx.forEach(f => {
            const a = now - f.t;
            ctx.save();
            if (f.goal) {
                ctx.beginPath();
                ctx.rect(G.x, G.y, G.w, G.h);
                ctx.clip();
            }
            ctx.strokeStyle = f.col;
            ctx.globalAlpha = 1 - a / .8;
            ctx.lineWidth = 2;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.arc(f.x, f.y, 8 + (a - i * .1) * 130, 0, 7);
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    function drawAim(now) {
        if (mode !== 'idle' || !aim) return;
        const r = 14 + Math.sin(now * 6) * 1.5;
        ctx.save();
        ctx.strokeStyle = '#ffd24a';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0,0,0,.6)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, r, 0, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aim.x - r - 6, aim.y);
        ctx.lineTo(aim.x - r + 5, aim.y);
        ctx.moveTo(aim.x + r - 5, aim.y);
        ctx.lineTo(aim.x + r + 6, aim.y);
        ctx.moveTo(aim.x, aim.y - r - 6);
        ctx.lineTo(aim.x, aim.y - r + 5);
        ctx.moveTo(aim.x, aim.y + r - 5);
        ctx.lineTo(aim.x, aim.y + r + 6);
        ctx.stroke();
        ctx.restore();
    }

    /* ---------- Logique ---------- */
    function shoot(tx, ty) {
        // Le gardien choisit sa zone : gauche, centre ou droite
        const z = Math.floor(Math.random() * 3);
        const kx = [G.x + 55, 240, G.x + G.w - 55][z] + (Math.random() * 30 - 15);
        const ky = z === 1 ? 160 + Math.random() * 20 : 150 + Math.random() * 45;

        const inFrame = tx > G.x + 6 && tx < G.x + G.w - 6 && ty > G.y + 6 && ty < G.y + G.h - 4;
        const resu = !inFrame ? 'miss' : (Math.hypot(tx - kx, ty - ky) < 58 ? 'save' : 'goal');

        T = { tx, ty, kx, ky, res: resu };
        shots++;
        t0 = performance.now() / 1000;
        mode = 'shot';
        hint.style.opacity = 0;
        $('s').textContent = shots;
    }

    function finish(now) {
        mode = 'done';
        tDone = now;
        bEnd = { x: S.b.x, y: S.b.y, r: S.b.r };
        const R = T.res;
        if (R === 'goal') {
            goals++;
            $('g').textContent = goals;
            S.fx.push({ x: T.tx, y: T.ty, t: now, col: '#fff', goal: true });
        }
        if (R === 'save') S.fx.push({ x: T.tx, y: T.ty, t: now, col: '#ffb020' });
        res.textContent = R === 'goal' ? 'BUT !' : R === 'save' ? 'ARRÊT !' : 'RATÉ !';
        over.className = 'show ' + R;

        // Le lien du bas s'active : un but mène à la fin « victoire »,
        // un arrêt ou un raté à la fin « défaite ».
        if (suivant) {
            suivant.href = R === 'goal'
                ? 'chapitre2-fifa-penalty-but.html'
                : 'chapitre2-fifa-penalty-rate.html';
            suivant.classList.add('visible');
        }
    }

    function step(now) {
        const p = S.p, k = S.k, b = S.b;

        if (mode === 'idle') {
            k.x = 240 + Math.sin(now * 2) * 7;
            k.y = KB;
            k.ang = 0;
            k.reach = 0;
            p.kick = -1;
            p.run = 0;
        } else if (mode === 'shot') {
            const el = now - t0;
            if (el < RUN) {
                const e = ease(el / RUN);
                p.x = lerp(P0.x, KICK.x, e);
                p.y = lerp(P0.y, KICK.y, e);
                p.run = el * 13;
                p.kick = -1;
            } else {
                p.x = KICK.x;
                p.y = KICK.y;
                p.run = 0;
                p.kick = clamp((el - RUN) / .32);
            }
            if (el >= LAUNCH) {
                const f = clamp((el - LAUNCH) / FLIGHT);
                const e = 1 - Math.pow(1 - f, 1.25);
                b.x = lerp(SPOT.x, T.tx, e);
                b.y = lerp(SPOT.y, T.ty, e) - Math.sin(Math.PI * f) * 14;
                b.r = 11 * (1 - .4 * e);
                b.spin += .5;
            }
            const d = clamp((el - LAUNCH - .04) / .45);
            const de = 1 - Math.pow(1 - d, 2);
            k.x = lerp(240, T.kx, de);
            k.y = lerp(KB, T.ky, de) - Math.sin(Math.PI * de) * 10;
            k.ang = clamp((T.kx - 240) / 90, -1, 1) * 1.2 * de;
            k.reach = de;
            if (el >= LAUNCH + FLIGHT) finish(now);
        } else if (mode === 'done') {
            const u = clamp((now - tDone) / .45);
            const e = 1 - Math.pow(1 - u, 2);
            const R = T.res;
            if (R === 'goal') {
                b.y = bEnd.y + 14 * e;
            } else if (R === 'save') {
                const dir = T.tx >= T.kx ? 1 : -1;
                b.x = bEnd.x + dir * 45 * e;
                b.y = bEnd.y + 50 * u - 10 * Math.sin(Math.PI * u);
                b.spin += .3 * (1 - u);
            } else {
                b.y = bEnd.y - 25 * e;
                b.r = bEnd.r * (1 - .12 * e);
                b.spin += .3 * (1 - u);
            }
        } else if (mode === 'back') {
            const u = clamp((now - tBack) / .6);
            const e = ease(u);
            p.x = lerp(snap.p.x, P0.x, e);
            p.y = lerp(snap.p.y, P0.y, e);
            p.run = u < 1 ? now * 10 : 0;
            p.kick = -1;
            k.x = lerp(snap.k.x, 240, e);
            k.y = lerp(snap.k.y, KB, e);
            k.ang = lerp(snap.k.ang, 0, e);
            k.reach = lerp(snap.k.reach, 0, e);
            if (u >= 1) {
                mode = 'idle';
                hint.style.opacity = 1;
            }
        }
    }

    function frame(ts) {
        const now = ts / 1000;
        step(now);
        ctx.setTransform(dpr * SCALE, 0, 0, dpr * SCALE, 0, 0);
        ctx.drawImage(pitch, 0, 0, DW, DH);
        drawGoalBack();
        drawKeeper(S.k);

        // Ombre du ballon, posée au sol sous la trajectoire
        const b = S.b;
        const f = (mode === 'shot' && now - t0 >= LAUNCH)
            ? clamp((now - t0 - LAUNCH) / FLIGHT)
            : (mode === 'done' ? 1 : 0);
        const fade = mode === 'done' ? clamp((now - tDone) / .3) : 0;
        ctx.fillStyle = 'rgba(0,0,0,' + (.3 * (1 - fade)) + ')';
        ctx.beginPath();
        ctx.ellipse(b.x, lerp(SPOT.y, G.y + G.h, f) + b.r * .7, b.r * 1.1, b.r * .35, 0, 0, 7);
        ctx.fill();

        drawPlayer(S.p);
        drawBall(b);
        drawGoalFront();
        drawFx(now);
        drawAim(now);
        requestAnimationFrame(frame);
    }

    /* ---------- Souris / tactile ---------- */
    function pos(e) {
        const r = cv.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * DW / r.width,
            y: (e.clientY - r.top) * DH / r.height
        };
    }
    const inRange = q => q.x > G.x - 50 && q.x < G.x + G.w + 50 && q.y > G.y - 50 && q.y < G.y + G.h;

    cv.addEventListener('pointermove', e => {
        const q = pos(e);
        aim = inRange(q) ? q : null;
    });
    cv.addEventListener('pointerleave', () => { aim = null; });
    cv.addEventListener('pointerdown', e => {
        if (mode !== 'idle') return;
        const q = pos(e);
        if (inRange(q)) {
            aim = null;
            shoot(q.x, q.y);
        }
    });

    requestAnimationFrame(frame);
})();