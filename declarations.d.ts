// Ambient module declarations for packages missing explicit types
declare module "lucide-react";

// firebase/firestore — the installed firebase@12 package has a broken exports map
// (types entry points to a .d.ts that doesn't exist). Provide a minimal ambient
// declaration so TypeScript / Next.js build can pass.
declare module "firebase/firestore" {
  export type DocumentData = Record<string, any>;
  export type QuerySnapshot = any;
  export type QueryDocumentSnapshot = any;
  export type DocumentSnapshot = any;
  export type DocumentReference<T = DocumentData> = any;
  export type CollectionReference<T = DocumentData> = any;
  export type Query<T = DocumentData> = any;
  export type FieldValue = any;
  export type Firestore = any;
  export type Timestamp = any;

  export function getFirestore(app?: any): Firestore;
  export function doc(...args: any[]): DocumentReference;
  export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot>;
  export function setDoc(ref: DocumentReference, data: any, options?: any): Promise<void>;
  export function updateDoc(ref: DocumentReference, data: any): Promise<void>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function collection(...args: any[]): CollectionReference;
  export function getDocs(query: Query): Promise<QuerySnapshot>;
  export function onSnapshot(query: any, callback: any): () => void;
  export function serverTimestamp(): FieldValue;
  export function query(...args: any[]): Query;
  export function where(...args: any[]): any;
  export function orderBy(...args: any[]): any;
  export function limit(...args: any[]): any;
  export function writeBatch(db: Firestore): any;
  export function runTransaction(db: Firestore, fn: any): Promise<any>;
}
