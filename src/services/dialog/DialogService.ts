import { injectable, singleton } from "microinject";
import { BehaviorSubject, map } from "rxjs";
import { last } from "lodash";

import {
  DialogAction,
  DialogRequest,
  isComponentDialogRequest,
  isTextDialogRequest,
} from "./types";
import {
  ActionPromptDialogModel,
  ComponentDialogModel,
  DialogModel,
} from "./DialogModel";

interface CurrentDialogDetails {
  model: DialogModel;
  resolve(completionResult: string | null): void;
  promise: Promise<string | null>;
}

@injectable()
@singleton()
export class DialogService {
  private readonly _dialogDetailQueue: CurrentDialogDetails[] = [];
  private readonly _currentDialogDetails$ =
    new BehaviorSubject<CurrentDialogDetails | null>(null);

  get currentDialog() {
    return this._currentDialogDetails$.value?.model ?? null;
  }

  private readonly _currentDialog$ = this._currentDialogDetails$.pipe(
    map((details) => details?.model ?? null)
  );
  get currentDialog$() {
    return this._currentDialog$;
  }

  showDialog(request: DialogRequest): Promise<string | null> {
    const details = this._openDialog(request);
    if (!details) {
      return Promise.reject(new Error(`Unknown dialog type ${request.type}`));
    }

    return details.promise;
  }

  private _openDialog(request: DialogRequest) {
    let model: DialogModel | null = null;
    if (isTextDialogRequest(request)) {
      model = new ActionPromptDialogModel(
        request.text,
        request.actions,
        this._resolveDialog.bind(this)
      );
    } else if (isComponentDialogRequest(request)) {
      model = new ComponentDialogModel(
        request.component,
        this._resolveDialog.bind(this)
      );
    }

    if (!model) {
      return null;
    }

    let resolve: (result: string) => void;
    const promise = new Promise<string | null>((r) => (resolve = r));
    const details: CurrentDialogDetails = {
      model,
      resolve: resolve!,
      promise,
    };
    this._dialogDetailQueue.push(details);
    this._currentDialogDetails$.next(details);
    return details;
  }

  closeDialog(dialogPromise: Promise<string | null>) {
    const index = this._dialogDetailQueue.findIndex(
      ({ promise }) => promise === dialogPromise
    );
    if (index === -1) {
      return;
    }

    this._dialogDetailQueue.splice(index, 1);

    // Was the last index.
    if (index === this._dialogDetailQueue.length) {
      this._currentDialogDetails$.next(last(this._dialogDetailQueue) ?? null);
    }
  }

  private _resolveDialog(completionResult: string | null) {
    const currentDialog = this._currentDialogDetails$.value;
    if (!currentDialog) {
      return;
    }

    currentDialog.resolve(completionResult);
    this.closeDialog(currentDialog.promise);
  }
}
