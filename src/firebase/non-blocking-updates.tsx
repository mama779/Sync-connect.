'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded')) {
      console.warn('[Firestore Quota Exceeded] Write blocked by quota limit:', docRef.path);
      return;
    }
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data,
      })
    )
  })
}

export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(error => {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded')) {
        console.warn('[Firestore Quota Exceeded] Write blocked by quota limit:', colRef.path);
        return null;
      }
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      )
    });
  return promise;
}

export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded')) {
        console.warn('[Firestore Quota Exceeded] Update blocked by quota limit:', docRef.path);
        return;
      }
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}

export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded')) {
        console.warn('[Firestore Quota Exceeded] Delete blocked by quota limit:', docRef.path);
        return;
      }
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}