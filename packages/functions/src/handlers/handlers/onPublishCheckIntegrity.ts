import { RecordUserData, RecordData, FirestoreDateLike, CheckIntegrityMessage } from '@yukukuru/types';
import * as _ from 'lodash';
import { getWatches } from '../../modules/firestore/watches/getWatches';
import { removeWatches } from '../../modules/firestore/watches/removeWatches';
import { PubSubOnPublishHandler } from '../../types/functions';
import { convertRecords } from '../../utils/convert';
import { getDiffFollowers, DiffWithId, getDiffWithIdRecords, checkSameEndDiff } from '../../utils/diff';
import { addRecords } from '../../utils/firestore/records/addRecords';
import { getRecords } from '../../utils/firestore/records/getRecords';
import { removeRecords } from '../../utils/firestore/records/removeRecords';
import { updateRecordsStart } from '../../utils/firestore/records/updateRecordsStart';
import { getTwUser } from '../../utils/firestore/twUsers/getTwUser';
import { updateUserCheckIntegrity } from '../../utils/firestore/users/integrity';
import { log, errorLog } from '../../utils/log';
import { mergeWatches } from '../../utils/watches';

type Props = CheckIntegrityMessage['data'];

export const onPublishCheckIntegrityHandler: PubSubOnPublishHandler = async (message, context) => {
  const { uid } = message.json as Props;
  const now = new Date(context.timestamp);

  const watches = mergeWatches(await getWatches({ uid, count: 80 }), true);

  if (watches.length < 5) {
    await updateUserCheckIntegrity(uid, now);
    return;
  }

  // 今回比較する watches 以外を取り除く
  watches.splice(watches.length - 3, watches.length);
  // 今回比較する watches のうち、最古のものの取得開始時刻
  const firstDate = watches[0].watch.getEndDate.toDate();
  // 今回比較する watches のうち、最新のものの取得開始時刻
  const lastDate = watches[watches.length - 1].watch.getEndDate.toDate();
  const records = await getRecords({ uid, cursor: firstDate, max: lastDate });

  const currentDiffs = getDiffFollowers(watches.map(({ watch }) => watch));
  const currentDiffsWithId: DiffWithId[] = currentDiffs.map((diff) => ({ id: '', diff }));

  const firestoreDiffsWithId: DiffWithId[] = convertRecords(records).map(({ id, data: record }) => ({
    id,
    diff: {
      type: record.type,
      uid: record.user.id,
      durationStart: record.durationStart.toDate(),
      durationEnd: record.durationEnd.toDate(),
    },
  }));

  // 存在すべきなのに存在する差分
  const notExistsDiffs = getDiffWithIdRecords(currentDiffsWithId, firestoreDiffsWithId);
  // 存在すべきではないが何故か存在する差分
  const unknownDiffs = getDiffWithIdRecords(firestoreDiffsWithId, currentDiffsWithId);

  if (notExistsDiffs.length !== 0) {
    // 存在しないドキュメントは追加する
    const items = notExistsDiffs.map(
      async ({ diff }): Promise<RecordData<FirestoreDateLike>> => {
        const user = await getTwUser(diff.uid);
        const userData: RecordUserData =
          user === null
            ? {
                id: diff.uid,
                maybeDeletedOrSuspended: true,
              }
            : {
                id: diff.uid,
                screenName: user.data.screenName,
                displayName: user.data.name,
                photoUrl: user.data.photoUrl,
                maybeDeletedOrSuspended: true,
              };
        return {
          type: diff.type,
          user: userData,
          durationStart: diff.durationStart,
          durationEnd: diff.durationEnd,
        };
      }
    );
    await addRecords({ uid, items: await Promise.all(items) });
  }

  // 存在しないドキュメントがある場合は追加する
  if (notExistsDiffs.length !== 0 && unknownDiffs.length === 0) {
    log('onPublishCheckIntegrity', 'checkIntegrity', { type: 'hasNotExistsDiffs', uid, notExistsDiffs });
  }

  // 得体のしれないドキュメントがある場合はエラーを出す
  else if (notExistsDiffs.length === 0 && unknownDiffs.length !== 0) {
    const removeRecordIds = _.flatten(unknownDiffs.map(({ id }) => id));
    await removeRecords({ uid, removeIds: removeRecordIds });

    log('onPublishCheckIntegrity', 'checkIntegrity', { type: 'hasUnknownDiffs', uid, unknownDiffs, removeRecordIds });
  }

  // 何も変化がない場合、そのまま削除する
  else if (notExistsDiffs.length === 0 && unknownDiffs.length === 0) {
    const removeIds = _.flatten(watches.map(({ ids }) => ids).slice(0, watches.length - 1));
    await removeWatches({ uid, removeIds });

    log('onPublishCheckIntegrity', 'checkIntegrity', { type: 'correctRecords', uid, removeIds });
  }

  // durationStart だけ異なるドキュメントがある場合は、アップデートする
  else if (checkSameEndDiff(notExistsDiffs, unknownDiffs)) {
    const starts = _.sortBy(notExistsDiffs, ({ diff: { type, uid, durationEnd } }) =>
      JSON.stringify({ type, uid, d: durationEnd.getTime() })
    );
    const targets = _.sortBy(unknownDiffs, ({ diff: { type, uid, durationEnd } }) =>
      JSON.stringify({ type, uid, d: durationEnd.getTime() })
    );

    const items = targets.map((target, i) => {
      return {
        id: target.id,
        start: starts[i].diff.durationStart,
      };
    });

    await updateRecordsStart({ uid, items });
    log('onPublishCheckIntegrity', 'checkIntegrity', { type: 'sameEnd', uid, notExistsDiffs, unknownDiffs, items });
  }

  // 想定されていない処理
  else {
    errorLog('onPublishCheckIntegrity', 'checkIntegrity', {
      type: 'checkIntegrity: ERROR',
      uid,
      notExistsDiffs,
      unknownDiffs,
    });
  }

  await updateUserCheckIntegrity(uid, now);
};
