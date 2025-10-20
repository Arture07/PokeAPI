import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getApiBaseUrl } from '../../core/api.config';

interface PokemonDetail {
  codigo: number;
  nome: string;
  imagemUrl: string;
  descricao?: string;
  descricaoFonte?: string;
  descricaoIdioma?: string;
  tipos: string[];
  altura_m?: number;
  peso_kg?: number;
  categoria?: string;
  genero?: { maleRate: number; femaleRate: number; genderless: boolean };
  stats?: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number; total?: number };
  habilidades?: Array<{ nome: string; efeito?: string; isHidden?: boolean }>;
  efetividades?: {
    defesa?: { [key: string]: number };
    ataque?: { [key: string]: number };
  };
  evolucoes?: Array<{
    codigo: number;
    nome: string;
    imagemUrl: string;
    trigger?: string;
    minLevel?: number | null;
    item?: string | null;
    heldItem?: string | null;
    timeOfDay?: string | null;
    knownMoveType?: string | null;
    knownMove?: string | null;
    location?: string | null;
    minHappiness?: number | null;
    needsRain?: boolean | null;
    gender?: number | null;
    detalhes?: any;
  }>;
}

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  template: `
    <ng-template #loading>
      <div class="loading">Carregando…</div>
    </ng-template>

    <div class="detail-wrap" *ngIf="data as d; else loading">
      <div class="hero">
        <div class="img">
          <img [src]="d.imagemUrl" [alt]="d.nome" />
        </div>
        <div class="title">
          <h1>{{ d.nome }} Nº {{ d.codigo | number: '4.0-0' }}</h1>
          <p class="desc" *ngIf="d.descricao">{{ descricaoPT(d.descricao, d.descricaoIdioma) }}</p>
          <div class="meta">
            <small *ngIf="d.descricaoFonte">Fonte: {{ formatVersion(d.descricaoFonte) }}</small>
            <small *ngIf="d.descricaoIdioma && !isPT(d.descricaoIdioma)" class="lang">Idioma de origem: {{ d.descricaoIdioma }}</small>
          </div>
          <div class="type-chips">
            <mat-chip *ngFor="let t of d.tipos" [ngStyle]="{ 'background-color': typeColor(t), color: '#fff' }">
              <img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" />
              {{ typeLabel(t) }}
            </mat-chip>
          </div>
        </div>
      </div>

      <div class="grid">
        <mat-card>
          <mat-card-title>Dados</mat-card-title>
          <mat-card-content>
            <div *ngIf="d.altura_m != null">Altura: {{ d.altura_m | number: '1.1-2' }} m</div>
            <div *ngIf="d.peso_kg != null">Peso: {{ d.peso_kg | number: '1.1-2' }} kg</div>
            <div *ngIf="d.categoria">Categoria: {{ traduzGenus(d.categoria) }}</div>
            <div *ngIf="d.genero as g">Sexo: <span *ngIf="g.genderless">Sem sexo</span><span *ngIf="!g.genderless">{{ g.maleRate * 100 | number: '1.0-0' }}% ♂ / {{ g.femaleRate * 100 | number: '1.0-0' }}% ♀</span></div>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="d.stats as s">
          <mat-card-title>Estatísticas</mat-card-title>
          <mat-card-content>
            <div class="stat" *ngFor="let k of statOrder">
              <div class="stat-label">{{ statLabel(k) }}</div>
              <div class="stat-bar">
                <mat-progress-bar [value]="statVal(s, k)" mode="determinate"></mat-progress-bar>
                <span class="stat-val">{{ statVal(s, k) }}</span>
              </div>
            </div>
            <div class="stat total" *ngIf="s.total != null">
              <div class="stat-label">Total</div>
              <div class="stat-bar">
                <mat-progress-bar [value]="s.total" mode="determinate"></mat-progress-bar>
                <span class="stat-val">{{ s.total }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="d.habilidades?.length">
          <mat-card-title>Habilidades</mat-card-title>
          <mat-card-content>
            <div class="hab" *ngFor="let h of d.habilidades">
              <div class="hab-nome">{{ traduzHabilidade(h.nome) }} <small *ngIf="h.isHidden" style="color:#888">(Oculta)</small></div>
              <div class="hab-efeito" *ngIf="h.efeito">{{ traduzEfeito(h.efeito) }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="d.efetividades as eff">
          <mat-card-title>Efetividades</mat-card-title>
          <mat-card-content>
            <mat-tab-group>
              <mat-tab label="Defesa">
                <div class="eff-section" *ngIf="splitDef(eff.defesa) as se">
                  <div class="eff-row" *ngIf="se.muitoFraco.length">
                    <div class="eff-head">Fraquezas 4×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.muitoFraco" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                  <div class="eff-row" *ngIf="se.fraco.length">
                    <div class="eff-head">Fraquezas 2×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.fraco" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                  <div class="eff-row" *ngIf="se.resistente.length">
                    <div class="eff-head">Resistências 1/2×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.resistente" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                  <div class="eff-row" *ngIf="se.muitoResistente.length">
                    <div class="eff-head">Resistências 1/4×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.muitoResistente" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                  <div class="eff-row" *ngIf="se.imune.length">
                    <div class="eff-head">Imunidades 0×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.imune" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                </div>
              </mat-tab>
              <mat-tab label="Ataque">
                <div class="eff-section" *ngIf="splitAtk(eff.ataque) as se">
                  <div class="eff-row" *ngIf="se.forte.length">
                    <div class="eff-head">Fortes 2×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.forte" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                  <div class="eff-row" *ngIf="se.fraco.length">
                    <div class="eff-head">Fracos 1/2×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.fraco" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                  <div class="eff-row" *ngIf="se.semEfeito.length">
                    <div class="eff-head">Sem efeito 0×</div>
                    <div class="eff-tags">
                      <span class="tag" *ngFor="let t of se.semEfeito" [ngStyle]="{'background-color': typeColor(t)}"><img class="type-icon-img" [src]="typeIconUrl(t)" [alt]="typeLabel(t)" (error)="onTypeIconError($event, t)" /> {{ typeLabel(t) }}</span>
                    </div>
                  </div>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="d.evolucoes?.length">
          <mat-card-title>Evoluções</mat-card-title>
          <mat-card-content>
            <div class="evo-list">
              <div class="evo" *ngFor="let e of d.evolucoes" (click)="goTo(e.codigo)" tabindex="0" role="button">
                <img [src]="e.imagemUrl" [alt]="e.nome" />
                <div class="evo-info">
                  <div class="evo-nome">{{ e.nome }}</div>
                  <div class="evo-trigger" *ngIf="e.trigger" [innerHTML]="traduzTrigger(e)"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
    .detail-wrap { max-width: 1100px; margin: 0 auto; padding: 16px; }
    .hero { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: center; }
    .hero .img img { width: 200px; height: 200px; object-fit: contain; }
    .title h1 { margin: 0 0 8px; }
    .desc { margin: 0 0 6px; color: #555; }
    .meta small { margin-right: 12px; color: #666; }
    .type-chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .stat { margin: 6px 0; }
    .stat-bar { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; }
    .stat-label { font-weight: 600; margin-bottom: 2px; }
    .hab { margin: 8px 0; }
    .evo-list { display: flex; gap: 12px; flex-wrap: wrap; }
    .evo { display: flex; gap: 8px; align-items: center; border: 1px solid #eee; border-radius: 8px; padding: 6px 8px; cursor: pointer; }
    .evo img { width: 56px; height: 56px; object-fit: contain; }
    .eff-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
    .eff { display: flex; justify-content: space-between; border: 1px solid #eee; border-radius: 6px; padding: 6px 8px; }
  .type-icon{margin-right:4px}
  .type-icon-img{width:16px;height:16px;object-fit:contain;margin-right:4px;vertical-align:middle;display:inline-block}
    .eff-section{display:flex;flex-direction:column;gap:8px}
    .eff-row{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
    .eff-head{min-width:160px;font-weight:600;color:#444}
    .eff-tags{display:flex;gap:6px;flex-wrap:wrap}
    .tag{color:#fff;border-radius:12px;padding:2px 8px;display:inline-flex;align-items:center;gap:4px;font-size:12px}
    `,
  ],
})
export class PokemonDetailComponent {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);

  data: PokemonDetail | null = null;
  statOrder: Array<keyof NonNullable<PokemonDetail['stats']>> = ['hp','attack','defense','spAttack','spDefense','speed'];

  ngOnInit() {
    this.route.paramMap.subscribe(pm => {
      const codigo = Number(pm.get('codigo'));
      if (codigo) this.load(codigo);
    });
  }

  private load(codigo: number) {
    const base = getApiBaseUrl();
    const url = `${base}/pokemon/${codigo}/full/`;
    this.http.get<PokemonDetail>(url).subscribe({
      next: (res) => this.data = this.normalize(res),
      error: () => this.data = null,
    });
  }

  normalize(d: PokemonDetail): PokemonDetail {
    if (d.stats && d.stats.total == null) {
      const s = d.stats;
      d.stats.total = (s.hp||0)+(s.attack||0)+(s.defense||0)+(s.spAttack||0)+(s.spDefense||0)+(s.speed||0);
    }
    return d;
  }

  isPT(lang?: string | null) { return lang === 'pt-BR' || lang === 'pt'; }
  descricaoPT(text?: string | null, lang?: string | null) { return text || ''; }
  formatVersion(v?: string | null) { return v || ''; }

  typeColor(t: string) {
    const map: any = {
      normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD'
    };
    return map[t?.toLowerCase?.()] || '#888';
  }
  typeLabel(t: string) {
    const map: any = { normal:'Normal', fire:'Fogo', water:'Água', electric:'Elétrico', grass:'Planta', ice:'Gelo', fighting:'Lutador', poison:'Venenoso', ground:'Terrestre', flying:'Voador', psychic:'Psíquico', bug:'Inseto', rock:'Pedra', ghost:'Fantasma', dragon:'Dragão', dark:'Sombrio', steel:'Aço', fairy:'Fada' };
    return map[t?.toLowerCase?.()] || t;
  }
  typeIcon(t: string) {
    const map: any = { normal:'●', fire:'🔥', water:'💧', electric:'⚡', grass:'🌿', ice:'❄️', fighting:'🥊', poison:'☠️', ground:'⛰️', flying:'🕊️', psychic:'🔮', bug:'🐛', rock:'🪨', ghost:'👻', dragon:'🐉', dark:'🌑', steel:'⚙️', fairy:'✨' };
    return map[t?.toLowerCase?.()] || '●';
  }

  typeIconUrl(t: string) {
    const n = (t || '').toLowerCase();
    const valid = new Set(['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']);
    // Conjunto open-source amplamente usado (estilo oficial)
    return valid.has(n)
      ? `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${n}.svg`
      : '/assets/types/unknown.svg';
  }

  onTypeIconError(ev: Event, t: string) {
    const img = ev.target as HTMLImageElement;
    // Evita loop infinito
    if ((img as any)._triedFallback) return;
    (img as any)._triedFallback = true;
    // Fallback local
    img.src = '/assets/types/unknown.svg';
  }

  statLabel(k: string) {
    const map: any = { hp:'HP', attack:'Ataque', defense:'Defesa', spAttack:'Atk Esp', spDefense:'Def Esp', speed:'Velocidade' };
    return map[k] || k;
  }

  statVal(s: NonNullable<PokemonDetail['stats']>, k: keyof NonNullable<PokemonDetail['stats']>): number {
    const v = (s as Record<string, number | undefined>)[k as any];
    return typeof v === 'number' ? v : 0;
  }

  traduzGenus(g?: string | null) { return g || ''; }
  traduzHabilidade(n: string) { return n; }
  traduzEfeito(e: string) { return e; }

  typeKeys(obj: { [k: string]: number }) { return Object.keys(obj); }

  // --- Efetividades ---
  splitDef(map: { [k: string]: number } = {}) {
    const muitoFraco: string[] = []; // 4x
    const fraco: string[] = [];      // 2x
    const resistente: string[] = []; // 0.5x
    const muitoResistente: string[] = []; // 0.25x
    const imune: string[] = [];      // 0x
    for (const [k,v] of Object.entries(map)) {
      const val = Number(v||1);
      if (val >= 4) muitoFraco.push(k);
      else if (val >= 2) fraco.push(k);
      else if (val === 0) imune.push(k);
      else if (val <= 0.25) muitoResistente.push(k);
      else if (val <= 0.5) resistente.push(k);
    }
    const byName = (a:string,b:string)=>this.typeLabel(a).localeCompare(this.typeLabel(b));
    [muitoFraco, fraco, resistente, muitoResistente, imune].forEach(arr=>arr.sort(byName));
    return { muitoFraco, fraco, resistente, muitoResistente, imune };
  }
  splitAtk(map: { [k: string]: number } = {}) {
    const forte: string[] = []; // 2x
    const fraco: string[] = []; // 0.5x
    const semEfeito: string[] = []; // 0
    for (const [k,v] of Object.entries(map)) {
      const val = Number(v||1);
      if (val >= 2) forte.push(k);
      else if (val === 0) semEfeito.push(k);
      else if (val <= 0.5) fraco.push(k);
    }
    const byName = (a:string,b:string)=>this.typeLabel(a).localeCompare(this.typeLabel(b));
    ;[forte, fraco, semEfeito].forEach(arr=>arr.sort(byName));
    return { forte, fraco, semEfeito };
  }

  // --- Evoluções / Triggers ---
  private evoItemPT(item?: string | null) {
    if (!item) return '';
    const k = (item||'').toLowerCase();
    const dict: any = {
      'fire-stone':'Pedra Fogo','water-stone':'Pedra Água','thunder-stone':'Pedra Trovão','leaf-stone':'Pedra Folha','ice-stone':'Pedra Gelo','dusk-stone':'Pedra Noite','dawn-stone':'Pedra Alvorada','shiny-stone':'Pedra Brilhante','moon-stone':'Pedra da Lua','sun-stone':'Pedra do Sol',
      'metal-coat':'Revestimento Metálico','king\'s-rock':'Rocha do Rei','upgrade':'Melhorador','dubious-disc':'Disco Duvidoso','oval-stone':'Pedra Oval','razor-claw':'Garra Navalha','razor-fang':'Presa Navalha'
    };
    return dict[k] || item.replace(/-/g,' ');
  }
  private evoLocationPT(loc?: string | null) {
    if (!loc) return '';
    const k = (loc||'').toLowerCase();
    const dict: any = { 'eterna-forest':'Floresta Eterna', 'sinnoh-route-217':'Rota 217 (Sinnoh)' };
    return dict[k] || loc.replace(/-/g,' ');
  }
  traduzTrigger(e: { trigger?: string; minLevel?: number | null; item?: string | null; heldItem?: string | null; timeOfDay?: string | null; knownMoveType?: string | null; knownMove?: string | null; location?: string | null; minHappiness?: number | null; needsRain?: boolean | null; gender?: number | null; detalhes?: any; }) {
    if (!e?.trigger) return '';
    const T = e.trigger;
    const det: any = (e as any).detalhes || e;
    const parts: string[] = [];
    const push = (s: string)=>{ if (s) parts.push(s); };
    if (T === 'level-up') {
      push('⬆️ Sobe de nível');
      if (det.minLevel != null) push(`Lv ${det.minLevel}`);
      if (det.timeOfDay === 'day') push('🌞 Dia');
      if (det.timeOfDay === 'night') push('🌙 Noite');
      if (det.minHappiness != null) push(`😊 Felicidade ≥ ${det.minHappiness}`);
      if (det.knownMoveType) push(`⚔️ Tipo ${this.typeLabel(det.knownMoveType)}`);
      if (det.knownMove) push(`🎯 Golpe ${String(det.knownMove).replace(/-/g,' ')}`);
      if (det.needsRain) push('🌧️ Chuva');
      if (det.location) push(`📍 ${this.evoLocationPT(det.location)}`);
      if (det.gender === 1) push('♀ Somente fêmea');
      if (det.gender === 2) push('♂ Somente macho');
      if (det.minAffection != null) push(`💞 Afeição ≥ ${det.minAffection}`);
      if (det.minBeauty != null) push(`✨ Beleza ≥ ${det.minBeauty}`);
      if (typeof det.relativeStats === 'number') {
        if (det.relativeStats > 0) push('⚖️ Atk > Def');
        else if (det.relativeStats < 0) push('⚖️ Atk < Def');
        else push('⚖️ Atk = Def');
      }
      if (det.turnUpsideDown) push('🔄 Virar o dispositivo');
      return parts.join(' • ');
    }
    if (T === 'use-item' && (det.item || e.item)) {
      return `🪄 Usa item: ${this.evoItemPT(det.item || e.item || '')}`;
    }
    if (T === 'trade') {
      const held = (det.heldItem || e.heldItem) ? ` com ${this.evoItemPT(det.heldItem || e.heldItem || '')}` : '';
      const tradeFor = det.tradeSpecies ? ` por ${String(det.tradeSpecies).replace(/-/g,' ')}` : '';
      return `🔁 Troca${held}${tradeFor}`;
    }
    return T;
  }

  goTo(codigo: number) {
    // Navega para o detalhe do pokémon clicado na evolução sem recarregar a página
    this.router.navigate(['/pokemon', codigo]);
  }
}
