import * as React from "react";
import { debounce } from "lodash";
import { operators as spy } from "rxjs-spy";

import {
  combineLatest,
  OperatorFunction,
  Observable,
  Subscription,
  map,
  distinctUntilChanged,
  mergeMap,
  defer,
  from,
  shareReplay,
} from "rxjs";
import { arrayShallowEquals } from "./utils";

export type ObservableKeys<T> = {
  [K in keyof T]: T[K] extends Observable<any> ? K : never;
}[keyof T];

export type Observation<T> = T extends Observable<infer K> ? K : never;

export function useObservation<T>(
  tag: string,
  observable: Observable<T>
): T | undefined;
export function useObservation<T>(
  tag: string,
  factory: () => Observable<T>,
  deps?: any[]
): T | undefined;
export function useObservation<T>(
  tag: string,
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps?: any[]
) {
  const factory = React.useMemo(
    () =>
      typeof observableOrFactory === "function"
        ? observableOrFactory
        : () => observableOrFactory,
    deps ? [...deps] : [observableOrFactory]
  );

  const [value, setValue] = React.useState<T | undefined>(undefined);

  React.useEffect(() => {
    const sub = factory()
      .pipe(spy.tag("useObservation " + tag))
      .subscribe((value) => setValue(value));
    return () => sub.unsubscribe();
  }, [factory]);

  return value;
}

export function promiseFuncToObservable<T>(
  func: () => Promise<T>
): Observable<T> {
  return defer(() => from(func())).pipe(shareReplay(1));
}

export function distinctUntilShallowArrayChanged() {
  return (source: Observable<readonly any[]>): Observable<readonly any[]> => {
    return source.pipe(distinctUntilChanged(arrayShallowEquals));
  };
}

export function filterItems<T, K extends T>(filter: (item: T) => item is K) {
  return (source: Observable<readonly T[]>): Observable<K[]> => {
    return source.pipe(map((items) => items.filter(filter)));
  };
}

export function filterItemObservations<T, K extends T>(
  filter: (item: T) => Observable<boolean>
) {
  return (source: Observable<readonly T[]>): Observable<K[]> => {
    return source.pipe(
      mapArrayItemsCached("filterItemObservations", (item) =>
        filter(item).pipe(map((isMatch) => ({ item, isMatch })))
      ),
      observeAll("filterItemObservations"),
      map((items) =>
        items.filter(({ isMatch }) => isMatch).map(({ item }) => item as K)
      )
    );
  };
}

export function mapItems<T, K>(mapping: (item: T) => K) {
  return (source: Observable<readonly T[]>): Observable<K[]> => {
    return source.pipe(map((items) => items.map(mapping)));
  };
}

export function pickObservable<T, K extends ObservableKeys<T>>(key: K) {
  return (source: Observable<T>): Observable<Observation<T[K]>> => {
    return source.pipe(mergeMap((value) => value[key] as any)) as any;
  };
}

export function observeAll<K>(
  name: string
): OperatorFunction<Observable<K>[], K[]> {
  return (source: Observable<Observable<K>[]>) => {
    return new Observable<K[]>((subscriber) => {
      const subscriberMap = new Map<
        Observable<K>,
        { subscription: Subscription; lastValue: K | undefined }
      >();
      const tryEmitValues = debounce(
        () => {
          const values = Array.from(subscriberMap.values()).map(
            ({ lastValue }) => lastValue
          );

          if (values.some((value) => value === undefined)) {
            return;
          }

          subscriber.next(values as any);
        },
        0,
        { leading: false, trailing: true }
      );

      function subscribeToChild(observable: Observable<K>) {
        const values = {
          subscription: new Subscription(),
          lastValue: undefined,
        };

        // This must be set before we subscribe as cold observables will give us a value immediately.
        subscriberMap.set(observable, values);

        values.subscription = observable.subscribe({
          next: (value) => {
            const entry = subscriberMap.get(observable);
            if (entry) {
              entry.lastValue = value;
              tryEmitValues();
            } else {
              console.warn("Observable not found in subscriber map.");
            }
          },
          error: (err) => {
            subscriber.error(err);
          },
          // Don't care about complete, it will stick to its last value forever.
          // Note: If we never got a value, we will be stuck waiting for the undefined value forever.... maybe do something about that.
        });
      }

      function trySubscribe(observable: Observable<K>) {
        if (!subscriberMap.has(observable)) {
          subscribeToChild(observable);
          return true;
        }

        return false;
      }

      function clearOldSubscriptions(values: Observable<K>[]) {
        let cleared = 0;
        for (const [observable, { subscription }] of subscriberMap.entries()) {
          if (!values.includes(observable)) {
            cleared++;
            subscription.unsubscribe();
            subscriberMap.delete(observable);
          }
        }
        console.log(name, "Cleared", cleared, "old subscriptions.");
      }

      function onTopLevelUpdate(values: Observable<K>[]) {
        clearOldSubscriptions(values);
        let subscribed = 0;
        for (const value of values) {
          if (trySubscribe(value)) {
            subscribed++;
          }
        }
        console.log(name, "Subscribed to", subscribed, "observables.");
      }

      const topLevelSubscription = source.subscribe({
        next: onTopLevelUpdate,
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      return () => {
        for (const { subscription } of subscriberMap.values()) {
          subscription.unsubscribe();
        }

        topLevelSubscription.unsubscribe();
      };
    });
  };
}

export function mapArrayItemsCached<T, R>(
  tag: string,
  fn: (value: T) => R
): OperatorFunction<readonly T[], R[]> {
  const cache = new Map<T, R>();

  return (source: Observable<readonly T[]>): Observable<R[]> => {
    return source.pipe(
      map((arr) => {
        // Temporary set to track items in the current array.
        const currentSet = new Set<T>();

        let newItems = 0;
        const result = arr.map((item) => {
          currentSet.add(item);

          if (cache.has(item)) {
            return cache.get(item) as R;
          } else {
            const newValue = fn(item);
            cache.set(item, newValue);
            newItems++;
            return newValue;
          }
        });

        // Remove items from the cache that aren't in the current array.
        for (const key of cache.keys()) {
          if (!currentSet.has(key)) {
            cache.delete(key);
          }
        }

        console.log(tag, "mapArrayItemsCached made", newItems, "new items");
        return result;
      })
    );
  };
}

export function profile(tag: string) {
  return <T>(source: Observable<T>): Observable<T> => {
    return new Observable<T>((subscriber) => {
      return source.subscribe((value) => {
        console.time(tag);
        subscriber.next(value);
        console.timeEnd(tag);
      });
    });
  };
}
