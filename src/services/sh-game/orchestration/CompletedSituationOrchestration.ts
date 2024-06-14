import { BehaviorSubject, Observable, map, shareReplay } from "rxjs";
import { Aspects, combineAspects } from "secrethistories-api";

import { EmptyObject$, observeAllMap } from "@/observables";

import { Compendium, RecipeModel } from "@/services/sh-compendium";

import { SituationModel } from "../token-models/SituationModel";

import {
  CompletedOrchestration,
  Orchestration,
  OrchestrationBase,
  OrchestrationSlot,
} from "./types";
import { ElementStackModel } from "../token-models/ElementStackModel";

export class CompletedSituationOrchestration
  implements OrchestrationBase, CompletedOrchestration
{
  constructor(
    private readonly _situation: SituationModel,
    private readonly _replaceOrchestration: (
      orchestration: Orchestration | null
    ) => void
  ) {}

  _dispose() {}

  get label$(): Observable<string | null> {
    return this._situation.label$;
  }

  get description$() {
    return this._situation.description$;
  }

  get requirements$(): Observable<Readonly<Aspects>> {
    return EmptyObject$;
  }

  private readonly _situation$ = new BehaviorSubject(this._situation);
  get situation$(): Observable<SituationModel | null> {
    return this._situation$;
  }

  get slots$(): Observable<Readonly<Record<string, OrchestrationSlot>>> {
    return EmptyObject$;
  }

  private _aspects$: Observable<Readonly<Aspects>> | null = null;
  get aspects$(): Observable<Readonly<Aspects>> {
    if (!this._aspects$) {
      this._aspects$ = this._situation.output$.pipe(
        observeAllMap((output) => output.aspects$),
        map((aspects) => aspects.reduce((a, b) => combineAspects(a, b), {})),
        shareReplay(1)
      );
    }

    return this._aspects$;
  }

  get notes$() {
    return this._situation.notes$;
  }

  get content$(): Observable<readonly ElementStackModel[]> {
    return this._situation.output$;
  }

  async conclude(): Promise<boolean> {
    if (await this._situation.conclude()) {
      this._replaceOrchestration(null);
      return true;
    }

    return false;
  }
}
