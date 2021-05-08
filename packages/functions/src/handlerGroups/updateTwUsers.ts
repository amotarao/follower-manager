import * as functions from 'firebase-functions';
import { onPublishUpdateTwUsersHandler } from '../handlers/onPublishUpdateTwUsers';
import { updateTwUsersHandler } from '../handlers/updateTwUsers';
import { Topic } from '../modules/pubsub/topics';

/** Twitter ユーザー情報更新 定期実行 */
export const updateTwUsers = functions
  .region('asia-northeast1')
  .runWith({
    timeoutSeconds: 10,
    memory: '256MB',
  })
  .pubsub.schedule('* * * * *')
  .timeZone('Asia/Tokyo')
  .onRun(updateTwUsersHandler);

/** PubSub: Twitter ユーザー情報更新 個々の実行 */
export const onPublishUpdateTwUsers = functions
  .region('asia-northeast1')
  .runWith({
    timeoutSeconds: 20,
    memory: '256MB',
  })
  .pubsub.topic(Topic.UpdateTwUsers)
  .onPublish(onPublishUpdateTwUsersHandler);
