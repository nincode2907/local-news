import "server-only";
import { connect } from "./connection";
export const { db, client } = connect();
