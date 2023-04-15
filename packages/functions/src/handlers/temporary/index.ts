import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { firestore } from '../../modules/firebase';
import { bulkWriterErrorHandler } from '../../modules/firestore/error';
import { sharedTokensCollectionRef } from '../../modules/firestore/sharedToken';
import { tokensCollectionRef } from '../../modules/firestore/tokens';

export const deleteFieldsSharedTokens = functions
  .region('asia-northeast1')
  .runWith({
    timeoutSeconds: 20,
    memory: '512MB',
  })
  .pubsub.schedule('*/5 * * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    const bulkWriter = firestore.bulkWriter();
    bulkWriter.onWriteError(bulkWriterErrorHandler);

    const invalidSnapshot = await sharedTokensCollectionRef.where('_invalid', '==', true).get();
    invalidSnapshot.docs.forEach((doc) => {
      bulkWriter.delete(doc.ref);
      bulkWriter.delete(tokensCollectionRef.doc(doc.id));
    });

    const hasInvalidSnapshot = await sharedTokensCollectionRef.orderBy('_invalid').limit(100).get();
    hasInvalidSnapshot.docs.forEach((doc) => {
      bulkWriter.update(doc.ref, {
        _invalid: FieldValue.delete(),
      } as any);
    });

    const hasInvalidV1Snapshot = await sharedTokensCollectionRef.orderBy('_invalidV1').limit(100).get();
    hasInvalidV1Snapshot.docs.forEach((doc) => {
      bulkWriter.update(doc.ref, {
        _invalidV1: FieldValue.delete(),
      } as any);
    });

    await bulkWriter.close();
    console.log(`${invalidSnapshot.size + hasInvalidSnapshot.size + hasInvalidV1Snapshot.size} docs deleted.`);
  });
