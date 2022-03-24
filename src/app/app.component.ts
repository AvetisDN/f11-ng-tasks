import { Observable, BehaviorSubject } from 'rxjs';
import {
  TaskDialogComponent,
  TaskDialogResult,
  TaskDialogData,
} from './task-dialog/task-dialog.component';
import { Task } from './task/tast';
import { Component, enableProdMode } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from '@angular/fire/compat/firestore';

const getObservable = (col: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject<Task[]>([]);
  col.valueChanges({ idField: 'id' }).subscribe((value: Task[]) => {
    subject.next(value);
  });
  return subject;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Tasks Desk';

  tasks = getObservable(this.store.collection('tasks'));
  pending = getObservable(this.store.collection('pending'));
  done = getObservable(this.store.collection('done'));

  constructor(private dialog: MatDialog, private store: AngularFirestore) {}

  editTask(list: 'tasks' | 'done' | 'pending', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true,
      },
    });
    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined) => {
        if (!result) return;
        if (result.delete) {
          this.store.collection(list).doc(task.id).delete();
        } else {
          this.store.collection(list).doc(task.id).update(task);
        }
      });
  }

  drop(event: CdkDragDrop<BehaviorSubject<Task[]>>): void {
    if (event.previousContainer === event.container) return;
    if (!event.container.data || !event.previousContainer.data) return;

    const item = event.previousContainer.data.value[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      const promise = Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item),
      ]);
      return promise;
    });
    transferArrayItem(
      event.previousContainer.data.value,
      event.container.data.value,
      event.previousIndex,
      event.currentIndex
    );
  }

  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });
    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined) => {
        if (!result) return;
        this.store.collection('tasks').add(result.task);
      });
  }
}
