import React from "react";

export default function InboxPage() {
  return (
    <section>
      <h1>Inbox</h1>
      <form action="/api/tasks" method="post">
        <label>
          Title
          <input name="title" />
        </label>
        <label>
          Remaining minutes
          <input min="1" name="remainingMinutes" type="number" />
        </label>
        <button type="submit">Add task</button>
      </form>
    </section>
  );
}
