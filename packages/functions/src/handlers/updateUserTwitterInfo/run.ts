import { UserData } from '@yukukuru/types';
import * as functions from 'firebase-functions';
import { getToken } from '../../modules/firestore/tokens/get';
import { updateUserTwitterInfo } from '../../modules/firestore/users/state';
import { getClient } from '../../modules/twitter/client';
import { getUsersLookup } from '../../modules/twitter/users/lookup';
import { topicName, Message } from './_pubsub';

/** PubSub: Twitter 情報更新 個々の実行 */
export const run = functions
  .region('asia-northeast1')
  .runWith({
    timeoutSeconds: 10,
    memory: '256MB',
  })
  .pubsub.topic(topicName)
  .onPublish(async (message, context) => {
    const { uid, twitterId, publishedAt } = message.json as Message;
    const now = new Date(context.timestamp);

    // 10秒以内の実行に限る
    if (now.getTime() - new Date(publishedAt).getTime() > 1000 * 10) {
      console.error(`❗️[Error]: Failed to run functions: published more than 10 seconds ago.`);
      return;
    }

    console.log(`⚙️ Starting update user document twitter info for [${uid}].`);

    const token = await getToken(uid);

    if (token === null) {
      console.error(`❗️[Error]: Failed to get token of [${uid}]: Token is not exists.`);
      return;
    }
    console.log(`⏳ Got watches and token from Firestore.`);

    const client = getClient({
      accessToken: token.twitterAccessToken,
      accessSecret: token.twitterAccessTokenSecret,
    });
    const result = await getUsersLookup(client, { usersId: [twitterId] });

    if ('error' in result || !result.response.users[0]) {
      console.error(`❗️[Error]: Failed to get user from Twitter of [${uid}].`);
      return;
    }
    console.log(`⏳ Got user info from Twitter.`);

    const twitter: UserData['twitter'] = {
      id: result.response.users[0].id_str,
      screenName: result.response.users[0].screen_name,
      name: result.response.users[0].name,
      photoUrl: result.response.users[0].profile_image_url_https,
      followersCount: result.response.users[0].followers_count,
      verified: result.response.users[0].verified,
    };

    await updateUserTwitterInfo(uid, twitter, now);

    console.log(`⏳ Updated user document twitter info of [${uid}].`);

    console.log(`✔️ Completed update user document twitter info for [${uid}].`);
  });
