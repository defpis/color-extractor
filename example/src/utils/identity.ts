import { v4 } from "uuid";

export type UniqueId = string;

export const makeId = (): UniqueId => v4();
