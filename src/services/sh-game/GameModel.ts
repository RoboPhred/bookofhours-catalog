import { inject, injectable, singleton } from "microinject";
import { Observable, combineLatest, map, shareReplay } from "rxjs";

import {
  mapArrayItemsCached,
  observeAll,
  profileDownstream,
} from "@/observables";

import {
  ElementStackModel,
  isElementStackModel,
} from "./token-models/ElementStackModel";
import {
  SituationModel,
  isSituationModel,
} from "./token-models/SituationModel";

import {
  RunningSource,
  CharacterSource,
  TerrainsSource,
  TokensSource,
} from "./sources";
import { Compendium, ElementModel } from "../sh-compendium";

const playerSpherePaths = [
  "~/portage1",
  "~/portage2",
  "~/portage3",
  "~/portage4",
  "~/portage5",
  "~/hand.abilities",
  "~/hand.skills",
  "~/hand.memories",
  "~/hand.misc",
];

@injectable()
@singleton()
export class GameModel {
  constructor(
    @inject(RunningSource)
    private readonly _runningSource: RunningSource,
    @inject(Compendium) private readonly _compendium: Compendium,
    @inject(CharacterSource) private readonly _characterSource: CharacterSource,
    @inject(TokensSource) private readonly _tokensSource: TokensSource,
    @inject(TerrainsSource) private readonly _terrainsSource: TerrainsSource
  ) {}

  get isRunning$() {
    return this._runningSource.isRunning$;
  }

  get isRunning() {
    return this._runningSource.isRunning;
  }

  private _year$: Observable<number> | null = null;
  get year$() {
    if (!this._year$) {
      this._year$ = this._characterSource.recipeExecutions$.pipe(
        map(yearFromExecutions),
        shareReplay(1)
      );
    }

    return this._year$;
  }

  get year() {
    return yearFromExecutions(this._characterSource.recipeExecutions);
  }

  private _season$: Observable<string> | null = null;
  get season$() {
    if (!this._season$) {
      this._season$ = this._characterSource.recipeExecutions$.pipe(
        map(seasonFromExecutions),
        shareReplay(1)
      );
    }

    return this._season$;
  }

  get season() {
    return seasonFromExecutions(this._characterSource.recipeExecutions);
  }

  private _visibleElementStacks$: Observable<
    readonly ElementStackModel[]
  > | null = null;
  get visibleElementStacks$() {
    if (this._visibleElementStacks$ === null) {
      const elementStacksWithPath$ = this._tokensSource.tokens$.pipe(
        map((tokens) => tokens.filter(isElementStackModel)),
        mapArrayItemsCached((token) =>
          token.path$.pipe(map((path) => ({ token, path })))
        ),
        observeAll()
      );

      this._visibleElementStacks$ = combineLatest([
        elementStacksWithPath$,
        this._terrainsSource.unlockedTerrains$,
      ]).pipe(
        map(([tokenPathPair, terrains]) => {
          const visiblePaths = [
            ...playerSpherePaths,
            ...terrains.map((t) => t.path),
          ];
          const result = tokenPathPair
            .filter((x) => visiblePaths.some((p) => x.path.startsWith(p)))
            .map((x) => x.token);

          return result;
        }),
        profileDownstream("visibleElementStacks$"),
        shareReplay(1)
      );
    }

    return this._visibleElementStacks$;
  }

  get unlockedTerrains$() {
    return this._terrainsSource.unlockedTerrains$;
  }

  private _unlockedWorkstations$: Observable<readonly SituationModel[]> | null =
    null;

  get unlockedWorkstations$() {
    if (this._unlockedWorkstations$ === null) {
      const situationsWithPath$ = this._tokensSource.tokens$.pipe(
        map((tokens) => tokens.filter(isSituationModel)),
        mapArrayItemsCached((token) =>
          token.path$.pipe(map((path) => ({ token, path })))
        ),
        observeAll()
      );

      this._unlockedWorkstations$ = combineLatest([
        situationsWithPath$,
        this._terrainsSource.unlockedTerrains$,
      ]).pipe(
        map(([tokenPathPair, terrains]) => {
          const visiblePaths = [
            ...playerSpherePaths,
            ...terrains.map((t) => t.path),
          ];
          return tokenPathPair
            .filter((x) => visiblePaths.some((p) => x.path.startsWith(p)))
            .map((x) => x.token);
        }),
        profileDownstream("unlockedWorkstations$"),
        shareReplay(1)
      );
    }
    return this._unlockedWorkstations$;
  }

  private _uniqueElementsManfiested$: Observable<
    readonly ElementModel[]
  > | null = null;
  get uniqueElementsManifested$() {
    if (!this._uniqueElementsManfiested$) {
      this._uniqueElementsManfiested$ =
        this._characterSource.uniqueElementIdsManifested$.pipe(
          map((ids) => ids.map((id) => this._compendium.getElementById(id))),
          shareReplay(1)
        );
    }

    return this._uniqueElementsManfiested$;
  }
}

function yearFromExecutions(
  recipeExecutions: Record<string, number> | undefined
) {
  if (!recipeExecutions) {
    return 0;
  }

  return (recipeExecutions["year.season.spring"] ?? 1) - 1;
}

function seasonFromExecutions(
  recipeExecutions: Record<string, number> | undefined
) {
  if (!recipeExecutions) {
    return "spring";
  }

  const springCount = recipeExecutions["year.season.spring"] ?? 0;
  const summerCount = recipeExecutions["year.season.summer"] ?? 0;
  const autumCount = recipeExecutions["year.season.autum"] ?? 0;
  const winterCount = recipeExecutions["year.season.winter"] ?? 0;

  // The lesser is the one we are at.
  if (springCount > summerCount) {
    return "summer";
  }
  if (summerCount > autumCount) {
    return "autum";
  }
  if (autumCount > winterCount) {
    return "winter";
  }
  return "spring";
}
