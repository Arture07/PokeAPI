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
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { getApiBaseUrl } from '../../core/api.config';
import { PokemonService } from '../../core/pokemon.service';
import { AuthService } from '../../core/auth.service';

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
  stats?: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
    total?: number;
  };
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
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <ng-template #loading>
      <div class="loading">Carregando…</div>
    </ng-template>

    <div
      class="detail-wrap"
      *ngIf="data as d; else loading"
      [style.--bg1]="typeColor(d.tipos[0] || '')"
      [style.--bg2]="darken(typeColor(d.tipos[0] || ''), 0.35)"
      [style.--typeColor]="typeColor(d.tipos[0] || '')"
    >
      <div class="header-bar">
        <button mat-icon-button matTooltip="Voltar" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="spacer"></div>
        <div class="actions">
          <button
            mat-icon-button
            [matTooltip]=
              "isFavorite(d.codigo) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
            (click)="toggleFavorite(d.codigo)"
            [attr.aria-pressed]="isFavorite(d.codigo)"
          >
            <mat-icon>{{ isFavorite(d.codigo) ? 'favorite' : 'favorite_border' }}</mat-icon>
          </button>
        </div>
      </div>

      <div class="pokedex-layout">
        <div class="left-col">
          <div class="hero-card">
            <div class="hero-img">
              <img [src]="d.imagemUrl" [alt]="d.nome" />
            </div>
            <h1 class="poke-name">
              {{ capitalizeName(d.nome) }} Nº {{ d.codigo | number : '4.0-0' }}
            </h1>
            <div class="hero-actions">
              <button
                mat-stroked-button
                color="primary"
                (click)="toggleFavorite(d.codigo)"
                [attr.aria-pressed]="isFavorite(d.codigo)"
                [matTooltip]=
                  "isFavorite(d.codigo) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
              >
                <mat-icon>{{ isFavorite(d.codigo) ? 'favorite' : 'favorite_border' }}</mat-icon>
                <span>{{ isFavorite(d.codigo) ? 'Favorito' : 'Favoritar' }}</span>
              </button>
              <button
                mat-stroked-button
                color="accent"
                (click)="toggleTeam(d.codigo)"
                [matTooltip]=
                  "isInTeam(d.codigo) ? 'Remover da equipe' : 'Adicionar à equipe'"
              >
                <mat-icon>{{ isInTeam(d.codigo) ? 'group' : 'group_add' }}</mat-icon>
                <span>{{ isInTeam(d.codigo) ? 'Na Equipe' : 'Adicionar à Equipe' }}</span>
              </button>
            </div>
            <div class="type-chips appear">
              <mat-chip
                *ngFor="let t of d.tipos; let i = index"
                [ngStyle]="{
                  'background-color': typeColor(t),
                  color: '#fff',
                  'animation-delay': i * 60 + 'ms'
                }"
                class="appear"
              >
                <img
                  class="type-icon-img"
                  [src]="typeIconUrl(t)"
                  [alt]="typeLabel(t)"
                  (error)="onTypeIconError($event, t)"
                />
                {{ typeLabel(t) }}
              </mat-chip>
            </div>
            <p class="desc" *ngIf="d.descricao">
              {{ descricaoPT(d.descricao, d.descricaoIdioma) }}
            </p>
            <div class="meta">
              <small *ngIf="d.descricaoFonte"
                >Fonte: {{ formatVersion(d.descricaoFonte) }}</small
              >
              <small
                *ngIf="d.descricaoIdioma && !isPT(d.descricaoIdioma)"
                class="lang"
                >Idioma de origem: {{ d.descricaoIdioma }}</small
              >
            </div>
          </div>
        </div>

        <div class="right-col">
          <mat-card>
            <mat-card-title>Dados</mat-card-title>
            <mat-card-content>
              <div *ngIf="d.altura_m != null">
                Altura: {{ d.altura_m | number : '1.1-2' }} m
              </div>
              <div *ngIf="d.peso_kg != null">
                Peso: {{ d.peso_kg | number : '1.1-2' }} kg
              </div>
              <div *ngIf="d.categoria">
                Categoria: {{ traduzGenus(d.categoria) }}
              </div>
              <div *ngIf="d.genero as g">
                Sexo: <span *ngIf="g.genderless">Sem sexo</span
                ><span *ngIf="!g.genderless"
                  >{{ g.maleRate * 100 | number : '1.0-0' }}% ♂ /
                  {{ g.femaleRate * 100 | number : '1.0-0' }}% ♀</span
                >
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card *ngIf="d.stats as s">
            <mat-card-title>Estatísticas</mat-card-title>
            <mat-card-content>
              <div
                class="stat appear"
                *ngFor="let k of statOrder; let i = index"
                [style.animation-delay]="i * 50 + 'ms'"
              >
                <div class="stat-label">{{ statLabel(k) }}</div>
                <div class="stat-bar">
                  <div
                    class="stat-track"
                    role="progressbar"
                    [attr.aria-label]="statLabel(k)"
                    [attr.aria-valuenow]="statVal(s, k)"
                    [attr.aria-valuemin]="0"
                    [attr.aria-valuemax]="255"
                  >
                    <div
                      class="stat-fill"
                      [style.width.%]="statPercent(s, k)"
                      [style.background-color]="typeColor(d.tipos[0] || '')"
                    ></div>
                  </div>
                  <span class="stat-val">{{ statVal(s, k) }}</span>
                </div>
              </div>
              <div
                class="stat total appear"
                *ngIf="s.total != null"
                style="animation-delay: 320ms"
              >
                <div class="stat-label">Total</div>
                <div class="stat-bar">
                  <div
                    class="stat-track"
                    role="progressbar"
                    [attr.aria-label]="'Total'"
                    [attr.aria-valuenow]="s.total"
                    [attr.aria-valuemin]="0"
                    [attr.aria-valuemax]="720"
                  >
                    <div
                      class="stat-fill"
                      [style.width.%]="totalPercent(s.total)"
                      [style.background-color]="typeColor(d.tipos[0] || '')"
                    ></div>
                  </div>
                  <span class="stat-val">{{ s.total }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card *ngIf="d.habilidades?.length">
            <mat-card-title>Habilidades</mat-card-title>
            <mat-card-content>
              <div class="hab" *ngFor="let h of d.habilidades">
                <div class="hab-nome">
                  {{ traduzHabilidade(h.nome) }}
                  <small *ngIf="h.isHidden" style="color:#888">(Oculta)</small>
                </div>
                <div class="hab-efeito" *ngIf="h.efeito">
                  {{ traduzEfeito(h.efeito) }}
                </div>
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
                        <span
                          class="tag"
                          *ngFor="let t of se.muitoFraco"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                    <div class="eff-row" *ngIf="se.fraco.length">
                      <div class="eff-head">Fraquezas 2×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.fraco"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                    <div class="eff-row" *ngIf="se.resistente.length">
                      <div class="eff-head">Resistências 1/2×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.resistente"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                    <div class="eff-row" *ngIf="se.muitoResistente.length">
                      <div class="eff-head">Resistências 1/4×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.muitoResistente"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                    <div class="eff-row" *ngIf="se.imune.length">
                      <div class="eff-head">Imunidades 0×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.imune"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                  </div>
                </mat-tab>
                <mat-tab label="Ataque">
                  <div class="eff-section" *ngIf="splitAtk(eff.ataque) as se">
                    <div class="eff-row" *ngIf="se.forte.length">
                      <div class="eff-head">Fortes 2×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.forte"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                    <div class="eff-row" *ngIf="se.fraco.length">
                      <div class="eff-head">Fracos 1/2×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.fraco"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                    <div class="eff-row" *ngIf="se.semEfeito.length">
                      <div class="eff-head">Sem efeito 0×</div>
                      <div class="eff-tags">
                        <span
                          class="tag"
                          *ngFor="let t of se.semEfeito"
                          [ngStyle]="{ 'background-color': typeColor(t) }"
                          ><img
                            class="type-icon-img"
                            [src]="typeIconUrl(t)"
                            [alt]="typeLabel(t)"
                            (error)="onTypeIconError($event, t)"
                          />
                          {{ typeLabel(t) }}</span
                        >
                      </div>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </mat-card-content>
          </mat-card>

          <mat-card class="evo-card" *ngIf="$any(d) as dd">
            <mat-card-title>Evoluções</mat-card-title>
            <mat-card-content>
              <ng-container *ngIf="buildEvolutionChainFromEdges(dd) as ec">
                <!-- Branching: multiple independent rows (one child per row) -->
                <ng-container
                  *ngIf="
                    $any(dd).evolutionEdges &&
                      isBranchingAtRoot(
                        $any(dd).evolutionEdges,
                        ec.root.codigo
                      );
                    else linearOrLegacy
                  "
                >
                  <div class="evo-multi-rows">
                    <div class="evo-row" *ngFor="let e of filteredEvolutions(ec.evolutions, ec.root.codigo)">
                      <!-- Root left -->
                      <div
                        class="evo-root-left"
                        tabindex="0"
                        role="button"
                        (click)="goTo(ec.root.codigo)"
                        (keydown.enter)="goTo(ec.root.codigo)"
                        (keydown.space)="
                          $event.preventDefault(); goTo(ec.root.codigo)
                        "
                      >
                        <div class="avatar">
                          <img [src]="ec.root.imagemUrl" [alt]="capitalizeName(ec.root.nome)" />
                        </div>
                        <div class="name">
                          {{ capitalizeName(ec.root.nome) }} Nº {{ padCode(ec.root.codigo) }}
                        </div>
                        <div class="types" *ngIf="ec.root.tipos?.length">
                          <span
                            class="badge"
                            *ngFor="let t of ec.root.tipos || []"
                            [ngStyle]="{ 'background-color': typeColor(t) }"
                            >{{ typeLabel(t) }}</span
                          >
                        </div>
                      </div>

                      <!-- Connector center: condition text above and horizontal arrow -->
                      <div class="evo-connector">
                        <div class="cond-text" *ngIf="e.conditionText">
                          {{ e.conditionText }}
                        </div>
                        <svg
                          class="arrow"
                          viewBox="0 0 220 20"
                          role="img"
                          [attr.aria-label]="
                            'Evolui para ' +
                            (e.toData?.nome ? capitalizeName(e.toData?.nome) : '#' + e.to) +
                            (e.conditionText ? ': ' + e.conditionText : '')
                          "
                        >
                          <path
                            d="M4 10 H200"
                            stroke="#b9c0ca"
                            stroke-width="2"
                            stroke-linecap="round"
                          />
                          <path
                            d="M200 4 L216 10 L200 16"
                            fill="none"
                            stroke="#b9c0ca"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>

                      <!-- Child right -->
                      <div
                        class="evo-child-right"
                        tabindex="0"
                        role="button"
                        (click)="goTo(e.to)"
                        (keydown.enter)="goTo(e.to)"
                        (keydown.space)="$event.preventDefault(); goTo(e.to)"
                      >
                        <div class="avatar">
                          <img
                            [src]="e.toData?.imagemUrl || ec.root.imagemUrl"
                            [alt]="e.toData?.nome ? capitalizeName(e.toData?.nome) : '#' + e.to"
                          />
                        </div>
                        <div class="name">
                          {{ e.toData?.nome ? capitalizeName(e.toData?.nome) : '#' + e.to }} Nº
                          {{ padCode(e.toData?.codigo || e.to) }}
                        </div>
                        <div class="types" *ngIf="e.toData?.tipos?.length">
                          <span
                            class="badge"
                            *ngFor="let t of e.toData?.tipos || []"
                            [ngStyle]="{ 'background-color': typeColor(t) }"
                            >{{ typeLabel(t) }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </ng-container>

                <!-- Linear (Bulbasaur style) or legacy fallback -->
                <ng-template #linearOrLegacy>
                  <div
                    class="evo-horizontal"
                    *ngIf="$any(dd).evolutionEdges?.length; else legacyFallback"
                  >
                    <ng-container
                      *ngFor="
                        let step of linearNodesAndTriggers(
                          $any(dd).evolutionEdges,
                          dd
                        );
                        let last = last
                      "
                    >
                      <div
                        class="evo-node"
                        (click)="goTo(step.node.codigo)"
                        tabindex="0"
                        role="button"
                        (keydown.enter)="goTo(step.node.codigo)"
                        (keydown.space)="
                          $event.preventDefault(); goTo(step.node.codigo)
                        "
                      >
                        <div class="evo-avatar">
                          <img
                            [src]="step.node.imagemUrl"
                            [alt]="capitalizeName(step.node.nome)"
                          />
                        </div>
                        <div class="evo-name">
                          {{ capitalizeName(step.node.nome) }} Nº
                          {{ padCode(step.node.codigo) }}
                        </div>
                        <div class="evo-types" *ngIf="step.node.tipos?.length">
                          <span
                            class="type-badge"
                            *ngFor="let t of step.node.tipos"
                            [ngStyle]="{ 'background-color': typeColor(t) }"
                            >{{ typeLabel(t) }}</span
                          >
                        </div>
                      </div>
                      <div class="evo-arrow-with-trigger" *ngIf="!last">
                        <div
                          class="evo-trigger"
                          *ngIf="step.triggerHtml"
                          [innerHTML]="step.triggerHtml"
                        ></div>
                        <span class="arrow glyph">→</span>
                      </div>
                    </ng-container>
                  </div>
                  <ng-template #legacyFallback>
                    <div class="evo-multi-rows" *ngIf="filteredLegacy(dd.evolucoes, dd.codigo).length">
                      <div class="evo-row" *ngFor="let it of filteredLegacy(dd.evolucoes, dd.codigo)">
                        <div
                          class="evo-root-left"
                          tabindex="0"
                          role="button"
                          (click)="goTo(dd.codigo)"
                          (keydown.enter)="goTo(dd.codigo)"
                          (keydown.space)="
                            $event.preventDefault(); goTo(dd.codigo)
                          "
                        >
                          <div class="avatar">
                            <img [src]="dd.imagemUrl" [alt]="capitalizeName(dd.nome)" />
                          </div>
                          <div class="name">
                            {{ capitalizeName(dd.nome) }} Nº {{ padCode(dd.codigo) }}
                          </div>
                        </div>
                        <div class="evo-connector">
                          <div class="cond-text" *ngIf="it.trigger">
                            {{ conditionTextFromEdge(it) }}
                          </div>
                          <svg
                            class="arrow"
                            viewBox="0 0 220 20"
                            role="img"
                            [attr.aria-label]="
                              'Evolui para ' +
                              it.nome +
                              (it.trigger
                                ? ': ' + conditionTextFromEdge(it)
                                : '')
                            "
                          >
                            <path
                              d="M4 10 H200"
                              stroke="#b9c0ca"
                              stroke-width="2"
                              stroke-linecap="round"
                            />
                            <path
                              d="M200 4 L216 10 L200 16"
                              fill="none"
                              stroke="#b9c0ca"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </div>
                        <div
                          class="evo-child-right"
                          tabindex="0"
                          role="button"
                          (click)="goTo(it.codigo)"
                          (keydown.enter)="goTo(it.codigo)"
                          (keydown.space)="
                            $event.preventDefault(); goTo(it.codigo)
                          "
                        >
                          <div class="avatar">
                            <img
                              [src]="it.imagemUrl || dd.imagemUrl"
                              [alt]="capitalizeName(it.nome)"
                            />
                          </div>
                          <div class="name">
                            {{ capitalizeName(it.nome) }} Nº {{ padCode(it.codigo) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ng-template>
                </ng-template>
              </ng-container>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .detail-wrap {
        position: relative;
        max-width: 1200px;
        margin: 0 auto;
        padding: 16px;
        border-radius: 16px;
        overflow: hidden;
        border-top: 6px solid var(--typeColor);
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--typeColor, #90caf9) 6%, #ffffff),
          color-mix(in srgb, var(--typeColor, #90caf9) 10%, #f9fbff)
        );
      }
  /* Marca d'água sutil */
      .detail-wrap::after {
        content: '';
        position: absolute;
        right: -60px;
        bottom: -60px;
        width: 280px;
        height: 280px;
        opacity: 0.08;
        pointer-events: none;
        background: radial-gradient(
          circle at 50% 50%,
          #000 0 56%,
          transparent 57% 100%
        );
        filter: grayscale(1);
        mask: radial-gradient(circle at 50% 50%, #0000 0 52%, #000 53% 100%);
      }
      .header-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0 12px;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .hero {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 20px;
        align-items: center;
      }
      .hero .img {
        background: rgba(255, 255, 255, 0.25);
        border-radius: 16px;
        backdrop-filter: blur(6px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        padding: 12px;
        transition: transform 0.2s ease;
      }
      .hero .img:hover {
        transform: translateY(-2px);
      }
      .hero .img img {
        width: 220px;
        height: 220px;
        object-fit: contain;
      }
      .pokedex-layout {
        display: grid;
        grid-template-columns: 380px 1fr;
        gap: 20px;
        align-items: start;
      }
      .left-col {
        position: sticky;
        top: 10px;
        align-self: start;
      }
      .hero-card {
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.65),
          rgba(255, 255, 255, 0.4)
        );
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 16px;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
        padding: 16px;
        backdrop-filter: blur(8px);
      }
      .hero-img {
        background: rgba(255, 255, 255, 0.6);
        border-radius: 16px;
        backdrop-filter: blur(6px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        padding: 12px;
        transition: transform 0.2s ease;
        display: grid;
        place-items: center;
      }
      .hero-img:hover {
        transform: translateY(-2px);
      }
      .hero-img img {
        width: 300px;
        height: 300px;
        object-fit: contain;
      }
      .poke-name {
        margin: 12px 0 4px;
        font-weight: 800;
        letter-spacing: 0.2px;
        text-align: center;
      }
      .hero-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        margin: 8px 0 6px;
      }
      .desc {
        margin: 0 0 6px;
        color: #213547;
        opacity: 0.9;
      }
      .meta small {
        margin-right: 12px;
        color: #233;
        opacity: 0.85;
      }
      .type-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin: 12px 0;
      }
      .type-chips mat-chip {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      .type-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin: 12px 0;
        justify-content: center;
      }
      .type-chips mat-chip {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
  /* Barra de estatística */
      .stat-track {
        position: relative;
        height: 10px;
        background: #e6e9ef;
        border-radius: 999px;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      .stat-fill {
        position: absolute;
        inset: 0 auto 0 0;
        height: 100%;
        border-radius: 999px;
        background: var(--typeColor, #1976d2);
        box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.35);
      }

  /* Animações sutis */
      @keyframes fadeSlideUp {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .appear {
        animation: fadeSlideUp 0.35s ease both;
      }
      .appear-slow {
        animation: fadeSlideUp 0.5s ease both;
      }
      .stat {
        margin: 8px 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      mat-card {
        background: rgba(255, 255, 255, 0.28) !important;
        border: 1px solid rgba(255, 255, 255, 0.35);
        backdrop-filter: blur(8px);
        border-radius: 14px !important;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
      }
      .right-col {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      mat-card {
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.65),
          rgba(255, 255, 255, 0.42)
        ) !important;
        border: 1px solid rgba(255, 255, 255, 0.55);
        backdrop-filter: blur(8px);
        border-radius: 14px !important;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
      }
      mat-card-title {
        position: relative;
        padding-bottom: 6px;
      }
      mat-card-title::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -2px;
        height: 3px;
        width: 42px;
        background: var(--typeColor);
        border-radius: 2px;
        transform-origin: left;
        animation: underlineIn 0.6s ease both;
      }
      @keyframes underlineIn {
        from {
          transform: scaleX(0);
          opacity: 0.3;
        }
        to {
          transform: scaleX(1);
          opacity: 1;
        }
      }
      .stat-fill {
        position: absolute;
        inset: 0 auto 0 0;
        height: 100%;
        border-radius: 999px;
        background: var(--typeColor, #1976d2);
        box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.35);
        transition: width 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
      }
      .stat {
        margin: 8px 0;
      }
      .stat-bar {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 8px;
      }
      .stat-label {
        font-weight: 600;
        margin-bottom: 2px;
      }
      .hab {
        margin: 10px 0;
      }
      .evo-list {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .evo-list.grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        overflow: visible;
      }
      .evo {
        display: inline-flex;
        gap: 10px;
        align-items: flex-start;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 12px;
        padding: 8px 10px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(4px);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        min-height: 84px;
      }
      .evo:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
      }
      .evo img {
        width: 64px;
        height: 64px;
        object-fit: contain;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.18));
      }
      .evo-arrow {
        display: none;
      }
      .evo-nome {
        font-weight: 600;
      }
      .evo-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .evo-trigger {
        color: #2a3547;
        font-size: 12px;
        line-height: 1.2;
        opacity: 0.9;
        word-break: break-word;
      }
      .eff-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 8px;
      }
      .eff {
        display: flex;
        justify-content: space-between;
        border: 1px solid #eee;
        border-radius: 6px;
        padding: 6px 8px;
      }
      .type-icon {
        margin-right: 4px;
      }
      .type-icon-img {
        width: 16px;
        height: 16px;
        object-fit: contain;
        margin-right: 4px;
        vertical-align: middle;
        display: inline-block;
      }
      .eff-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .eff-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .eff-head {
        min-width: 160px;
        font-weight: 600;
        color: #444;
      }
      .eff-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .tag {
        color: #fff;
        border-radius: 12px;
        padding: 2px 8px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
      }

  /* Cadeia de evolução (SVG) */
      .evo-chain-wrapper {
        width: 100%;
        overflow: auto;
        border-radius: 12px;
      }
      .evo-chain {
        width: 100%;
        height: auto;
        display: block;
      }
      .edge {
        stroke: #7a869a;
        stroke-width: 2;
        opacity: 0.9;
      }
      .node-bg {
        width: 320px;
        height: 84px;
        fill: rgba(255, 255, 255, 0.82);
        stroke: rgba(0, 0, 0, 0.06);
      }
      .node {
        cursor: pointer;
      }
      .node:hover .node-bg {
        filter: brightness(1.02);
      }
      .node-name {
        font: 600 14px Roboto, Arial, sans-serif;
        fill: #14202b;
      }
      .node-trigger {
        color: #2a3547;
        font-size: 12px;
        line-height: 1.2;
        opacity: 0.9;
      }

  /* Evolução linear (uma linha) */
      .evo-horizontal {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 20px;
        flex-wrap: nowrap;
        padding: 16px 8px;
        overflow-x: auto;
      }
      .evo-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 160px;
        cursor: pointer;
        border-radius: 12px;
        padding: 10px;
        background: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        border: 1px solid #eee;
      }
      .evo-node.card {
        background: #ffffff;
      }
      .evo-node.big {
        min-width: 220px;
      }
      .evo-avatar {
        width: 140px;
        height: 140px;
        border-radius: 50%;
        border: 4px solid #fff;
        box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.08),
          inset 0 0 0 3px
            color-mix(in srgb, var(--typeColor, #90caf9) 60%, #ffffff),
          0 8px 16px rgba(0, 0, 0, 0.06);
        display: grid;
        place-items: center;
        background: rgba(249, 249, 249, 0.95);
      }
      .evo-node.big .evo-avatar {
        width: 170px;
        height: 170px;
      }
      .evo-avatar img {
        width: 90%;
        height: 90%;
        object-fit: contain;
      }
      .evo-name {
        margin-top: 10px;
        font-weight: 700;
        color: #1a202c;
        text-align: center;
        letter-spacing: 0.2px;
      }
      .evo-arrow-with-trigger {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 56px;
        flex: 0 0 56px;
      }
      .evo-arrow-with-trigger .arrow.glyph {
        font-size: 24px;
        color: #bbb;
        line-height: 1;
      }
      .evo-trigger {
        color: #2b3445;
        font-size: 11px;
        opacity: 0.9;
        text-align: center;
        font-weight: 600;
        max-width: 52px;
        line-height: 1.15;
        word-break: break-word;
        white-space: normal;
      }

      .evo-types {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .type-badge {
        color: #fff;
        padding: 2px 10px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }

  /* Evolução ramificada */
      .evo-branch {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 24px;
        align-items: center;
      }
      .evo-root {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .evo-children {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        flex-wrap: wrap;
        gap: 24px;
      }
      .child-group {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 24px;
      }
      .child-arrow {
        color: #bbb;
        font-size: 28px;
        line-height: 1;
        user-select: none;
      }

  /* Card de evoluções */
      .evo-card {
        background: #fafafa !important;
        border: 1px solid #eee;
        color: inherit;
      }
      .evo-card .evo-name {
        color: #1a202c;
      }
      .evo-card {
        background: #fafafa !important;
        border: 1px solid #eee;
        color: inherit;
      }
      .evo-card .evo-name {
        color: #1a202c;
      }
      .child-arrow,
      .evo-arrow-with-trigger .arrow.glyph {
        animation: arrowPulse 1.6s ease-in-out infinite;
      }
      @keyframes arrowPulse {
        0% {
          transform: translateX(0);
          opacity: 0.8;
        }
        50% {
          transform: translateX(6px);
          opacity: 1;
        }
        100% {
          transform: translateX(0);
          opacity: 0.8;
        }
      }

      @media (max-width: 700px) {
        .evo-branch {
          grid-template-columns: 1fr;
          align-items: start;
        }
        .evo-root {
          justify-content: flex-start;
        }
        .evo-children {
          justify-content: flex-start;
        }
        @media (max-width: 700px) {
          .pokedex-layout {
            grid-template-columns: 1fr;
          }
          .left-col {
            position: static;
          }
          .evo-branch {
            grid-template-columns: 1fr;
            align-items: start;
          }
          .evo-root {
            justify-content: flex-start;
          }
          .evo-children {
            justify-content: flex-start;
          }
        }
      }

  /* Nova seção de evoluções */
      .evolutions {
        width: 100%;
      }
      .evo-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 24px;
        align-items: center;
      }
      .evo-root-card,
      .evo-card-item {
        background: #fff;
        border: 1px solid #e9edf2;
        border-radius: 12px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 160px;
        cursor: pointer;
      }
      .evo-root-card:focus,
      .evo-card-item:focus {
        outline: 3px solid
          color-mix(in srgb, var(--typeColor, #90caf9) 40%, #ffffff);
        outline-offset: 2px;
      }
      .evo-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 24px;
        flex-wrap: nowrap;
        overflow-x: auto;
      }
      .evo-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 16px;
      }
      .evolutions .avatar {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border: 4px solid #fff;
        box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.08),
          inset 0 0 0 3px
            color-mix(in srgb, var(--typeColor, #90caf9) 60%, #ffffff),
          0 8px 16px rgba(0, 0, 0, 0.06);
        display: grid;
        place-items: center;
        background: #f9f9f9;
      }
      .evolutions .avatar img {
        width: 90%;
        height: 90%;
        object-fit: contain;
      }
      .evolutions .name {
        margin-top: 8px;
        font-weight: 700;
        text-align: center;
        color: #1a202c;
      }
      .evolutions .types {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .evolutions .badge {
        color: #fff;
        padding: 2px 10px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      .evolutions .cond {
        margin-top: 6px;
        font-size: 12px;
        color: #2b3445;
        text-align: center;
      }

      @media (max-width: 900px) {
        .evo-grid {
          grid-template-columns: 1fr;
        }
        .evo-row {
          flex-wrap: wrap;
        }
      }

  /* Layout ramificado multi-linhas */
      .evo-multi-rows {
        display: block;
      }
      .evo-multi-rows .evo-row {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 20px;
        overflow: visible;
      }
      .evo-multi-rows .evo-root-left,
      .evo-multi-rows .evo-child-right {
        background: #fff;
        border: 1px solid #e9edf2;
        border-radius: 12px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        min-width: 180px;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }
      .evo-multi-rows .avatar {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border: 4px solid #fff;
        box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.08),
          inset 0 0 0 3px
            color-mix(in srgb, var(--typeColor, #90caf9) 60%, #ffffff),
          0 8px 16px rgba(0, 0, 0, 0.06);
        display: grid;
        place-items: center;
        background: #f9f9f9;
      }
      .evo-multi-rows .avatar img {
        width: 90%;
        height: 90%;
        object-fit: contain;
      }
      .evo-multi-rows .name {
        margin-top: 8px;
        font-weight: 700;
        color: #1a202c;
        text-align: center;
      }
      .evo-multi-rows .types {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .evo-multi-rows .badge {
        color: #fff;
        padding: 2px 10px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      .evo-multi-rows .evo-connector {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 220px;
      }
      .evo-multi-rows .evo-connector .cond-text {
        font-size: 12px;
        color: #2b3445;
        margin-bottom: 6px;
        text-align: center;
        max-width: 420px;
      }
      .evo-multi-rows .evo-connector .arrow {
        width: 100%;
        max-width: 440px;
        height: 20px;
      }

      @media (max-width: 900px) {
        .evo-multi-rows .evo-row {
          flex-direction: column;
          align-items: center;
        }
        .evo-multi-rows .evo-connector {
          order: 2;
          min-width: 0;
        }
        .evo-multi-rows .evo-connector .arrow {
          display: none;
        }
        .evo-multi-rows .evo-child-right {
          order: 3;
        }
      }
    `,
  ],
})
export class PokemonDetailComponent {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private location = inject(Location);
  private snackBar = inject(MatSnackBar);
  private api = inject(PokemonService);
  private auth = inject(AuthService);

  favorites = new Set<number>();
  team = new Set<number>();

  data: PokemonDetail | null = null;
  statOrder: Array<keyof NonNullable<PokemonDetail['stats']>> = [
    'hp',
    'attack',
    'defense',
    'spAttack',
    'spDefense',
    'speed',
  ];

  ngOnInit() {
    this.fetchFavoritesAndTeam();
    this.route.paramMap.subscribe((pm) => {
      const codigo = Number(pm.get('codigo'));
      if (codigo) this.load(codigo);
    });
  }

  private load(codigo: number) {
    const base = getApiBaseUrl();
    const url = `${base}/pokemon/${codigo}/full/`;
    this.http.get<PokemonDetail>(url).subscribe({
      next: (res) => (this.data = this.normalize(res)),
      error: () => (this.data = null),
    });
  }

  normalize(d: PokemonDetail): PokemonDetail {
    if (d.stats && d.stats.total == null) {
      const s = d.stats;
      d.stats.total =
        (s.hp || 0) +
        (s.attack || 0) +
        (s.defense || 0) +
        (s.spAttack || 0) +
        (s.spDefense || 0) +
        (s.speed || 0);
    }
    return d;
  }

  isPT(lang?: string | null) {
    return lang === 'pt-BR' || lang === 'pt';
  }
  descricaoPT(text?: string | null, lang?: string | null) {
    return text || '';
  }
  formatVersion(v?: string | null) {
    return v || '';
  }

  typeColor(t: string) {
    const map: any = {
      normal: '#A8A77A',
      fire: '#EE8130',
      water: '#6390F0',
      electric: '#F7D02C',
      grass: '#7AC74C',
      ice: '#96D9D6',
      fighting: '#C22E28',
      poison: '#A33EA1',
      ground: '#E2BF65',
      flying: '#A98FF3',
      psychic: '#F95587',
      bug: '#A6B91A',
      rock: '#B6A136',
      ghost: '#735797',
      dragon: '#6F35FC',
      dark: '#705746',
      steel: '#B7B7CE',
      fairy: '#D685AD',
    };
    return map[t?.toLowerCase?.()] || '#888888';
  }
  typeLabel(t: string) {
    const map: any = {
      normal: 'Normal',
      fire: 'Fogo',
      water: 'Água',
      electric: 'Elétrico',
      grass: 'Planta',
      ice: 'Gelo',
      fighting: 'Lutador',
      poison: 'Venenoso',
      ground: 'Terrestre',
      flying: 'Voador',
      psychic: 'Psíquico',
      bug: 'Inseto',
      rock: 'Pedra',
      ghost: 'Fantasma',
      dragon: 'Dragão',
      dark: 'Sombrio',
      steel: 'Aço',
      fairy: 'Fada',
    };
    return map[t?.toLowerCase?.()] || t;
  }
  typeIcon(t: string) {
    const map: any = {
      normal: '●',
      fire: '🔥',
      water: '💧',
      electric: '⚡',
      grass: '🌿',
      ice: '❄️',
      fighting: '🥊',
      poison: '☠️',
      ground: '⛰️',
      flying: '🕊️',
      psychic: '🔮',
      bug: '🐛',
      rock: '🪨',
      ghost: '👻',
      dragon: '🐉',
      dark: '🌑',
      steel: '⚙️',
      fairy: '✨',
    };
    return map[t?.toLowerCase?.()] || '●';
  }

  typeIconUrl(t: string) {
    const n = (t || '').toLowerCase();
    const valid = new Set([
      'normal',
      'fire',
      'water',
      'electric',
      'grass',
      'ice',
      'fighting',
      'poison',
      'ground',
      'flying',
      'psychic',
      'bug',
      'rock',
      'ghost',
      'dragon',
      'dark',
      'steel',
      'fairy',
    ]);
    // Conjunto open-source amplamente usado (estilo oficial)
    return valid.has(n)
      ? `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${n}.svg`
      : '/assets/types/unknown.svg';
  }
  padCode(code: number): string {
    const n = Number(code || 0);
    return n.toString().padStart(4, '0');
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
    const map: any = {
      hp: 'HP',
      attack: 'Ataque',
      defense: 'Defesa',
      spAttack: 'Atk Esp',
      spDefense: 'Def Esp',
      speed: 'Velocidade',
    };
    return map[k] || k;
  }

  statVal(
    s: NonNullable<PokemonDetail['stats']>,
    k: keyof NonNullable<PokemonDetail['stats']>
  ): number {
    const v = (s as Record<string, number | undefined>)[k as any];
    return typeof v === 'number' ? v : 0;
  }
  statPercent(
    s: NonNullable<PokemonDetail['stats']>,
    k: keyof NonNullable<PokemonDetail['stats']>
  ): number {
    // Normalize against 255 (common base stat max pre-Gen 9); keeps bars comparable
    const v = this.statVal(s, k);
    const pct = Math.max(0, Math.min(100, Math.round((v / 255) * 100)));
    return pct;
  }
  totalPercent(total: number | undefined | null): number {
    const t = typeof total === 'number' ? total : 0;
    // Typical total range 180-720; we clamp at 720 for width
    const pct = Math.max(0, Math.min(100, Math.round((t / 720) * 100)));
    return pct;
  }

  traduzGenus(g?: string | null) {
    return g || '';
  }
  traduzHabilidade(n: string) {
    return n;
  }
  traduzEfeito(e: string) {
    return e;
  }

  typeKeys(obj: { [k: string]: number }) {
    return Object.keys(obj);
  }

  // --- Efetividades ---
  splitDef(map: { [k: string]: number } = {}) {
    const muitoFraco: string[] = []; // 4x
    const fraco: string[] = []; // 2x
    const resistente: string[] = []; // 0.5x
    const muitoResistente: string[] = []; // 0.25x
    const imune: string[] = []; // 0x
    for (const [k, v] of Object.entries(map)) {
      const val = Number(v || 1);
      if (val >= 4) muitoFraco.push(k);
      else if (val >= 2) fraco.push(k);
      else if (val === 0) imune.push(k);
      else if (val <= 0.25) muitoResistente.push(k);
      else if (val <= 0.5) resistente.push(k);
    }
    const byName = (a: string, b: string) =>
      this.typeLabel(a).localeCompare(this.typeLabel(b));
    [muitoFraco, fraco, resistente, muitoResistente, imune].forEach((arr) =>
      arr.sort(byName)
    );
    return { muitoFraco, fraco, resistente, muitoResistente, imune };
  }
  splitAtk(map: { [k: string]: number } = {}) {
    const forte: string[] = []; // 2x
    const fraco: string[] = []; // 0.5x
    const semEfeito: string[] = []; // 0
    for (const [k, v] of Object.entries(map)) {
      const val = Number(v || 1);
      if (val >= 2) forte.push(k);
      else if (val === 0) semEfeito.push(k);
      else if (val <= 0.5) fraco.push(k);
    }
    const byName = (a: string, b: string) =>
      this.typeLabel(a).localeCompare(this.typeLabel(b));
    [forte, fraco, semEfeito].forEach((arr) => arr.sort(byName));
    return { forte, fraco, semEfeito };
  }

  // --- Evoluções / Triggers ---
  private evoItemPT(item?: string | null) {
    if (!item) return '';
    const k = (item || '').toLowerCase();
    const dict: any = {
      'fire-stone': 'Pedra Fogo',
      'water-stone': 'Pedra Água',
      'thunder-stone': 'Pedra Trovão',
      'leaf-stone': 'Pedra Folha',
      'ice-stone': 'Pedra Gelo',
      'dusk-stone': 'Pedra Noite',
      'dawn-stone': 'Pedra Alvorada',
      'shiny-stone': 'Pedra Brilhante',
      'moon-stone': 'Pedra da Lua',
      'sun-stone': 'Pedra do Sol',
      'metal-coat': 'Revestimento Metálico',
      "king's-rock": 'Rocha do Rei',
      upgrade: 'Melhorador',
      'dubious-disc': 'Disco Duvidoso',
      'oval-stone': 'Pedra Oval',
      'razor-claw': 'Garra Navalha',
      'razor-fang': 'Presa Navalha',
    };
    return dict[k] || item.replace(/-/g, ' ');
  }
  private evoLocationPT(loc?: string | null) {
    if (!loc) return '';
    const k = (loc || '').toLowerCase();
    const dict: any = {
      'eterna-forest': 'Floresta Eterna',
      'sinnoh-route-217': 'Rota 217 (Sinnoh)',
    };
    return dict[k] || loc.replace(/-/g, ' ');
  }
  traduzTrigger(e: {
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
  }) {
    if (!e?.trigger) return '';
    const T = e.trigger;
    const det: any = (e as any).detalhes || e;
    const parts: string[] = [];
    const push = (s: string) => {
      if (s) parts.push(s);
    };
    if (T === 'level-up') {
      push('⬆️ Sobe de nível');
      if (det.minLevel != null) push(`Lv ${det.minLevel}`);
      if (det.timeOfDay === 'day') push('🌞 Dia');
      if (det.timeOfDay === 'night') push('🌙 Noite');
      if (det.minHappiness != null) push(`😊 Felicidade ≥ ${det.minHappiness}`);
      if (det.knownMoveType)
        push(`⚔️ Tipo ${this.typeLabel(det.knownMoveType)}`);
      if (det.knownMove)
        push(`🎯 Golpe ${String(det.knownMove).replace(/-/g, ' ')}`);
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
      const held =
        det.heldItem || e.heldItem
          ? ` com ${this.evoItemPT(det.heldItem || e.heldItem || '')}`
          : '';
      const tradeFor = det.tradeSpecies
        ? ` por ${String(det.tradeSpecies).replace(/-/g, ' ')}`
        : '';
      return `🔁 Troca${held}${tradeFor}`;
    }
    return T;
  }

  goTo(codigo: number) {
    // Navega para o detalhe do pokémon clicado na evolução sem recarregar a página
    this.router.navigate(['/pokemon', codigo]);
  }

  // --- Favoritos & Equipe (persistência local) ---
  private fetchFavoritesAndTeam() {
    if (!this.auth.accessToken) return;
    this.api.getFavorites().subscribe({
      next: (res: any) => {
        const items = (res?.results || []) as Array<{ codigo: number }>;
        this.favorites = new Set(items.map((x) => x.codigo));
      },
      error: () => {},
    });
    this.api.getTeam().subscribe({
      next: (res: any) => {
        const items = (res?.results || []) as Array<{ codigo: number }>;
        this.team = new Set(items.map((x) => x.codigo));
        this.api.updateTeamCount(this.team.size);
      },
      error: () => {},
    });
  }
  isFavorite(code: number | undefined | null): boolean {
    if (!code && code !== 0) return false;
    return this.favorites.has(Number(code));
  }
  toggleFavorite(code: number | undefined | null) {
    if (!code && code !== 0) return;
    const n = Number(code);
    const inFav = this.favorites.has(n);
    const obs = inFav ? this.api.removeFavorite(n) : this.api.addFavorite(n);
    obs.subscribe({
      next: () => {
        if (inFav) {
          this.favorites.delete(n);
          this.notify('Removido dos favoritos');
        } else {
          this.favorites.add(n);
          this.notify('Adicionado aos favoritos');
        }
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Falha ao atualizar favoritos';
        this.notify(msg);
      },
    });
  }
  isInTeam(code: number | undefined | null): boolean {
    if (!code && code !== 0) return false;
    return this.team.has(Number(code));
  }
  toggleTeam(code: number | undefined | null) {
    if (!code && code !== 0) return;
    const n = Number(code);
    const inTeam = this.team.has(n);
    const obs = inTeam ? this.api.removeFromTeam(n) : this.api.addToTeam(n);
    obs.subscribe({
      next: () => {
        if (inTeam) {
          this.team.delete(n);
          this.notify('Removido da equipe');
        } else {
          this.team.add(n);
          this.notify('Adicionado à equipe');
        }
        this.api.updateTeamCount(this.team.size);
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Falha ao atualizar equipe';
        this.notify(msg);
      },
    });
  }
  private notify(msg: string) {
    try {
      this.snackBar.open(msg, 'Fechar', { duration: 2200 });
    } catch {
      // Fallback simples
      // eslint-disable-next-line no-alert
      alert(msg);
    }
  }

  // --- Evoluções: helpers para layout horizontal ---
  // Replace existing isBranchingAtRoot(edges, rootId)
  isBranchingAtRoot(
    edges: any[],
    candidateRootId: number | undefined
  ): boolean {
    if (!Array.isArray(edges) || edges.length === 0) return false;

    // build parent map
    const parents = new Map<number, number>();
    for (const e of edges) {
      if (typeof e.to === 'number' && typeof e.from === 'number') {
        parents.set(e.to, e.from);
      }
    }

    // determine actual root: prefer candidateRootId if it has no parent; otherwise pick any id without parent
    let root = candidateRootId;
    if (!root || parents.has(root)) {
      const allIds = new Set<number>();
      for (const e of edges) {
        if (typeof e.from === 'number') allIds.add(e.from);
        if (typeof e.to === 'number') allIds.add(e.to);
      }
      for (const id of allIds) {
        if (!parents.has(id)) {
          root = id;
          break;
        }
      }
    }
    if (!root) return false;

    // count children directly from root
    const children = edges.filter((e) => e.from === root);
    return children.length > 1;
  }

  childrenOf(edges: any[], id: number): any[] {
    if (!Array.isArray(edges) || !id) return [];
    return edges.filter((e) => e.from === id);
  }

  splitChildren(edges: any[], from: number) {
    const kids = this.childrenOf(edges, from);
    const half = Math.ceil(kids.length / 2);
    return { left: kids.slice(0, half), right: kids.slice(half) };
  }

  linearNodesAndTriggers(
    edges: any[],
    d: any
  ): Array<{
    node: { codigo: number; nome: string; imagemUrl: string; tipos?: string[] };
    triggerHtml?: string;
  }> {
    if (!Array.isArray(edges) || edges.length === 0) return [];

    // build maps
    const childrenByFrom = new Map<number, any[]>();
    const parents = new Map<number, number>();
    const toData = new Map<number, any>();
    for (const e of edges) {
      if (typeof e.from === 'number') {
        const arr = childrenByFrom.get(e.from) || [];
        arr.push(e);
        childrenByFrom.set(e.from, arr);
      }
      if (typeof e.to === 'number' && typeof e.from === 'number') {
        parents.set(e.to, e.from);
      }
      if (e.toData && e.toData.codigo) {
        toData.set(e.toData.codigo, e.toData);
      }
      if (e.fromData && e.fromData.codigo) {
        toData.set(e.fromData.codigo, e.fromData);
      }
    }

    // find root (prefer d.codigo if valid and without parent)
    let root: number | undefined =
      d && typeof d.codigo === 'number' ? d.codigo : undefined;
    if (!root || parents.has(root)) {
      const allIds = new Set<number>();
      edges.forEach((e) => {
        if (typeof e.from === 'number') allIds.add(e.from);
        if (typeof e.to === 'number') allIds.add(e.to);
      });
      for (const id of allIds) {
        if (!parents.has(id)) {
          root = id;
          break;
        }
      }
    }
    if (!root) return [];

    const nodeData = (id: number) => {
      if (id === d.codigo)
        return {
          codigo: d.codigo,
          nome: d.nome,
          imagemUrl: d.imagemUrl,
          tipos: d.tipos || [],
        };
      const td = toData.get(id);
      if (td)
        return {
          codigo: td.codigo,
          nome: td.nome,
          imagemUrl: td.imagemUrl,
          tipos: td.tipos || [],
        };
      return { codigo: id, nome: '#' + id, imagemUrl: d.imagemUrl, tipos: [] };
    };

    const result: Array<{ node: any; triggerHtml?: string }> = [];
    let curr: number | undefined = root;
    let guard = 0;
    while (curr != null && guard++ < 200) {
      const children: any[] = childrenByFrom.get(curr) || [];
      result.push({ node: nodeData(curr) });

      // If exactly one child, follow the chain (linear).
      if (children.length === 1) {
        const edge: any = children[0];
        result[result.length - 1].triggerHtml = this.traduzTrigger(edge);
        curr = edge.to;
        continue;
      }

      // If zero children -> end
      // If >1 children -> branching: stop linear traversal at this node (radial/fan-out will show children)
      break;
    }

    return result;
  }

  legacyLinear(
    d: any
  ): Array<{
    node: { codigo: number; nome: string; imagemUrl: string };
    triggerHtml?: string;
  }> {
    const list = Array.isArray(d?.evolucoes) ? (d.evolucoes as any[]) : [];
    return list.map((item) => ({
      node: { codigo: item.codigo, nome: item.nome, imagemUrl: item.imagemUrl },
      triggerHtml: item.trigger ? this.traduzTrigger(item) : undefined,
    }));
  }

  buildChain(
    d: any
  ): {
    svgWidth: number;
    svgHeight: number;
    nodes: any[];
    edges: any[];
  } | null {
    const edges =
      d && Array.isArray(d.evolutionEdges)
        ? (d.evolutionEdges as Array<any>)
        : null;
    if (!edges || !edges.length) return null;
    const childrenByFrom = new Map<number, any[]>();
    const parents = new Map<number, number>();
    const nodeInfo = new Map<number, any>();
    for (const e of edges) {
      const arr = childrenByFrom.get(e.from) || [];
      arr.push(e);
      childrenByFrom.set(e.from, arr);
      parents.set(e.to, e.from);
      if (e.toData) nodeInfo.set(e.toData.codigo, e.toData);
    }
    // Infer root: current pokemon codigo if present; else pick any node without parent
    const current = d && d.codigo ? Number(d.codigo) : undefined;
    let root = current;
    if (root == null || parents.has(root)) {
      const allIds = new Set<number>();
      edges.forEach((e) => {
        allIds.add(e.from);
        allIds.add(e.to);
      });
      for (const id of allIds) {
        if (!parents.has(id)) {
          root = id;
          break;
        }
      }
    }
    if (root == null) return null;

    // BFS by stages from root
    const stages: number[][] = [];
    const visited = new Set<number>();
    let frontier: number[] = [root];
    visited.add(root);
    while (frontier.length) {
      stages.push(frontier);
      const next: number[] = [];
      for (const n of frontier) {
        const kids = childrenByFrom.get(n) || [];
        for (const e of kids) {
          const t = e.to;
          if (!visited.has(t)) {
            visited.add(t);
            next.push(t);
          }
        }
      }
      frontier = next;
    }

    // Layout sizes
    const nodeW = 320; // rect width
    const nodeH = 84; // rect height
    const hGap = 80; // gap between stages
    const vGap = 18; // vertical gap between siblings
    const padding = 16;

    const stageWidths = stages.map(() => nodeW);
    const svgWidth =
      padding * 2 + stages.length * nodeW + (stages.length - 1) * hGap;
    // Compute per-stage heights by number of nodes
    const stageHeights = stages.map(
      (arr) => arr.length * nodeH + Math.max(0, arr.length - 1) * vGap
    );
    const svgHeight = Math.max(...stageHeights) + padding * 2;

    // Place nodes centered vertically per stage
    const nodePos = new Map<number, { x: number; y: number }>();
    stages.forEach((arr, i) => {
      const stageHeight = stageHeights[i];
      const startY = (svgHeight - stageHeight) / 2;
      const x = padding + i * (nodeW + hGap);
      arr.forEach((id, j) => {
        const y = startY + j * (nodeH + vGap);
        nodePos.set(id, { x, y });
      });
    });

    // Build nodes array with display info
    const nodes: any[] = [];
    const seenNodes = new Set<number>();
    for (const arr of stages) {
      for (const id of arr) {
        if (seenNodes.has(id)) continue;
        seenNodes.add(id);
        const pos = nodePos.get(id)!;
        const isCurrent = id === d.codigo;
        const data =
          id === d.codigo
            ? { codigo: d.codigo, nome: d.nome, imagemUrl: d.imagemUrl }
            : nodeInfo.get(id) || {};
        nodes.push({
          codigo: id,
          x: pos.x,
          y: pos.y,
          nome: data.nome || '#' + id,
          imagemUrl: data.imagemUrl || d.imagemUrl,
          triggerHtml: this.triggerFromParentHtml(parents.get(id), id, edges),
        });
      }
    }

    // Build edges with coordinates (connect mid-right to mid-left)
    const edgeLines: any[] = [];
    for (const e of edges) {
      const p1 = nodePos.get(e.from);
      const p2 = nodePos.get(e.to);
      if (!p1 || !p2) continue;
      edgeLines.push({
        x1: p1.x + nodeW,
        y1: p1.y + nodeH / 2,
        x2: p2.x,
        y2: p2.y + nodeH / 2,
      });
    }

    return { svgWidth, svgHeight, nodes, edges: edgeLines };
  }

  private triggerFromParentHtml(
    fromId: number | undefined,
    toId: number,
    edges: Array<any>
  ): string {
    if (fromId == null) return '';
    const e = edges.find((x) => x.from === fromId && x.to === toId);
    if (!e) return '';
    return this.traduzTrigger(e);
  }

  // --- New helpers: normalized chain builder ---
  // Returns { root, evolutions } from either evolutionEdges or legacy evolucoes
  buildEvolutionChainFromEdges(d: any): {
    root: { codigo: number; nome: string; imagemUrl: string; tipos?: string[] };
    evolutions: Array<{
      to: number;
      toData?: {
        codigo: number;
        nome: string;
        imagemUrl: string;
        tipos?: string[];
      };
      conditionText?: string;
    }>;
  } {
    const root = {
      codigo: d?.codigo,
      nome: d?.nome,
      imagemUrl: d?.imagemUrl,
      tipos: d?.tipos || [],
    };
    const evolutions: Array<{
      to: number;
      toData?: any;
      conditionText?: string;
    }> = [];

    // Primary source: evolutionEdges
    if (Array.isArray(d?.evolutionEdges) && d.evolutionEdges.length) {
      for (const edge of d.evolutionEdges as any[]) {
        if (edge?.from === root.codigo) {
          evolutions.push({
            to: edge.to,
            toData: edge.toData
              ? {
                  codigo: edge.toData.codigo,
                  nome: edge.toData.nome,
                  imagemUrl: edge.toData.imagemUrl,
                  tipos: edge.toData.tipos,
                }
              : undefined,
            conditionText: this.conditionTextFromEdge(edge),
          });
        }
      }
      // If no direct children but there is a linear chain, follow first child each step starting from inferred root
      if (!evolutions.length) {
        const edges: any[] = d.evolutionEdges;
        const parents = new Map<number, number>();
        const byFrom = new Map<number, any[]>();
        for (const e of edges) {
          parents.set(e.to, e.from);
          byFrom.set(e.from, [...(byFrom.get(e.from) || []), e]);
        }
        let start = root.codigo;
        if (parents.has(start)) {
          // find actual root in provided edges
          const ids = new Set<number>();
          edges.forEach((e) => {
            ids.add(e.from);
            ids.add(e.to);
          });
          for (const id of ids) {
            if (!parents.has(id)) {
              start = id;
              break;
            }
          }
        }
        let current = start;
        let guard = 0;
        while (guard++ < 50) {
          const kids = byFrom.get(current) || [];
          if (kids.length !== 1) break;
          const edge = kids[0];
          evolutions.push({
            to: edge.to,
            toData: edge.toData,
            conditionText: this.conditionTextFromEdge(edge),
          });
          current = edge.to;
        }
      }
      return { root, evolutions };
    }

    // Fallback: legacy d.evolucoes linear list
    if (Array.isArray(d?.evolucoes) && d.evolucoes.length) {
      for (const it of d.evolucoes as any[]) {
        evolutions.push({
          to: it.codigo,
          toData: { codigo: it.codigo, nome: it.nome, imagemUrl: it.imagemUrl },
          conditionText: this.conditionTextFromEdge(it),
        });
      }
    }
    return { root, evolutions };
  }

  // Filter helpers to avoid duplicating root as child
  filteredEvolutions(
    evolutions: Array<{ to: number }>,
    rootCodigo: number
  ): Array<{ to: number } & any> {
    return (evolutions || []).filter((e) => e && e.to !== rootCodigo);
  }
  filteredLegacy(list: any[], rootCodigo: number): any[] {
    return (list || []).filter((it) => it && it.codigo !== rootCodigo);
  }

  conditionTextFromEdge(edge: any): string | undefined {
    const txt = this.traduzTrigger(edge);
    return txt && String(txt).trim().length ? txt : undefined;
  }

  // --- UI helpers ---
  darken(hex: string, amount = 0.2): string {
    try {
      const h = (hex || '').replace('#', '');
      if (!(h.length === 6 || h.length === 3)) return hex || '#888888';
      const n =
        h.length === 3
          ? h
              .split('')
              .map((c) => c + c)
              .join('')
          : h;
      const r = parseInt(n.substring(0, 2), 16);
      const g = parseInt(n.substring(2, 4), 16);
      const b = parseInt(n.substring(4, 6), 16);
      const k = Math.max(0, Math.min(1, 1 - amount));
      const rr = Math.max(0, Math.min(255, Math.round(r * k)));
      const gg = Math.max(0, Math.min(255, Math.round(g * k)));
      const bb = Math.max(0, Math.min(255, Math.round(b * k)));
      const toHex = (v: number) => v.toString(16).padStart(2, '0');
      return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
    } catch {
      return hex || '#888888';
    }
  }

  // --- Names ---
  capitalizeName(name: string | undefined | null): string {
    const s = (name ?? '').toString();
    if (!s) return '';
    // Keep separators, capitalize word starts
    return s.replace(/(^|[\s-])([a-zà-úç])/giu, (m) => m.toUpperCase());
  }

  goBack() {
    this.location.back();
  }
}
