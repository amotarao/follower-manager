import { Record, RecordV2 } from '@yukukuru/types';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useEffect, useCallback, useReducer } from 'react';
import { fetchRecords, fetchRecordsV2 } from '../modules/firestore/records';

type State = {
  /** 初期状態かどうか */
  initial: boolean;

  /** 初期読み込み中かどうか */
  isFirstLoading: boolean;

  /** 続きを読み込み中かどうか */
  isNextLoading: boolean;

  /** 読み込みが完了しているかどうか */
  isFirstLoaded: boolean;

  /** 記録リスト */
  records: (QueryDocumentSnapshot<Record | RecordV2> | { text: string })[];

  /** 続きデータがあるかどうか */
  hasNext: boolean;

  /** V2 の取得が完了しているかどうか */
  isComputedFetchV2: boolean;

  /** カーソル */
  cursor: QueryDocumentSnapshot | Date | null;

  /** カーソル */
  cursorV2: QueryDocumentSnapshot | null;
};

const initialState: State = {
  initial: true,
  isFirstLoading: false,
  isNextLoading: false,
  isFirstLoaded: false,
  records: [],
  hasNext: true,
  isComputedFetchV2: false,
  cursor: null,
  cursorV2: null,
};

type DispatchAction =
  | {
      type: 'StartLoadInitialRecords';
    }
  | {
      type: 'StartLoadNextRecords';
    }
  | {
      type: 'FinishLoadRecords';
    }
  | {
      type: 'AddItems';
      payload: {
        docs: QueryDocumentSnapshot<Record>[];
        ended: boolean;
        cursor: QueryDocumentSnapshot | null;
      };
    }
  | {
      type: 'AddItemsV2';
      payload: {
        docs: QueryDocumentSnapshot<RecordV2>[];
        ended: boolean;
        cursor: QueryDocumentSnapshot | Date | null;
        cursorV2: QueryDocumentSnapshot | null;
      };
    }
  | {
      type: 'AddText';
      payload: {
        text: string;
      };
    }
  | {
      type: 'Initialize';
    };

const reducer = (state: State, action: DispatchAction): State => {
  switch (action.type) {
    case 'StartLoadInitialRecords': {
      return {
        ...state,
        initial: false,
        isFirstLoading: true,
        isNextLoading: false,
      };
    }

    case 'StartLoadNextRecords': {
      return {
        ...state,
        initial: false,
        isFirstLoading: false,
        isNextLoading: true,
      };
    }

    case 'FinishLoadRecords': {
      return {
        ...state,
        initial: false,
        isFirstLoaded: true,
        isFirstLoading: false,
        isNextLoading: false,
      };
    }

    case 'AddItems': {
      const { docs, ended, cursor } = action.payload;

      return {
        ...state,
        initial: false,
        records: [...state.records, ...docs],
        hasNext: !ended,
        cursor,
      };
    }

    case 'AddItemsV2': {
      const { docs, ended, cursor, cursorV2 } = action.payload;

      return {
        ...state,
        initial: false,
        records: [...state.records, ...docs],
        // V1 に続きがある可能性があるので必ず true
        hasNext: true,
        isComputedFetchV2: ended,
        cursor,
        cursorV2,
      };
    }

    case 'AddText': {
      return {
        ...state,
        records: [...state.records, { text: action.payload.text }],
      };
    }

    case 'Initialize': {
      return initialState;
    }

    default: {
      return state;
    }
  }
};

type Action = {
  /** 続きのデータを取得する */
  getNextRecords: () => void;
};

export const useRecords = (uid: string | null): [Readonly<State>, Action] => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getRecordsV1 = useCallback(
    (cursor = state.cursor) => {
      (async () => {
        if (!uid) return;
        await fetchRecords(uid, 50, cursor).then(({ docs }) => {
          cursor instanceof Date &&
            docs.length &&
            dispatch({
              type: 'AddText',
              payload: { text: 'このあたりでは記録が二重で表示されている可能性があります' },
            });

          dispatch({
            type: 'AddItems',
            payload: {
              docs,
              ended: docs.length < 50,
              cursor: docs.at(-1) ?? null,
            },
          });
        });
        dispatch({ type: 'FinishLoadRecords' });
      })();
    },
    [state, uid]
  );

  const getRecordsV2 = useCallback(() => {
    (async () => {
      if (!uid) return;
      await fetchRecordsV2(uid, 50, state.cursorV2).then(({ docs }) => {
        const ended = docs.length < 50;
        const cursor = docs.at(-1)?.data().date.toDate() ?? null;
        const cursorV2 = docs.at(-1) ?? null;

        dispatch({
          type: 'AddItemsV2',
          payload: {
            docs,
            ended,
            cursor,
            cursorV2,
          },
        });

        // V2 での取得が完了している場合は V1 の取得も行う
        if (ended) {
          getRecordsV1(cursor);
        }
      });
      dispatch({ type: 'FinishLoadRecords' });
    })();
  }, [state, uid, getRecordsV1]);

  /**
   * Records を取得し処理する
   */
  const getRecords = useCallback(() => {
    !state.isComputedFetchV2 ? getRecordsV2() : getRecordsV1();
  }, [state, getRecordsV2, getRecordsV1]);

  /**
   * UID が変更した際は初期化する
   */
  useEffect(() => {
    dispatch({ type: 'Initialize' });
  }, [uid]);

  /**
   * 初回 Records を取得する
   */
  useEffect(() => {
    if (!uid || !state.initial) {
      return;
    }
    dispatch({ type: 'StartLoadInitialRecords' });
    getRecords();
  }, [uid, state.initial, getRecords]);

  /**
   * 続きの Records を取得する
   */
  const getNextRecords = () => {
    if (state.isNextLoading || !uid) {
      return;
    }
    dispatch({ type: 'StartLoadNextRecords' });
    getRecords();
  };

  return [state, { getNextRecords }];
};
