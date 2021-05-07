import { setUserToNotActive } from '../../modules/firestore/users/active';
import { existsUserDoc } from '../../modules/firestore/users/exists';
import { AuthOnDeleteHandler } from '../../types/functions';

export const onDeleteUserHandler: AuthOnDeleteHandler = async ({ uid }) => {
  const exists = await existsUserDoc(uid);
  if (exists) {
    await setUserToNotActive(uid);
  }
};
