import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();

export const publishMessages = async <T extends Record<string, unknown>>(
  topicName: string,
  items: T[]
): Promise<void> => {
  const topic = pubsub.topic(topicName);
  const publishes = items.map(async (item) => {
    await topic.publishMessage({ json: item });
  });
  await Promise.all(publishes);
};
