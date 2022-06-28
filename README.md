## Lab Task Tracker

This tool provides a commnand line facility that can be used to monitor lab boostrap tasks in a visual format.

#### How to use it
The following commands provide various facilities that this CLI tool exposes.

```
lab-bootstrap monitor
```

Run the above command to show the status and elapsed time for the lab bootstrap tasks.

#### Creating a Task

The following command creates a new task with ID `mytask` and display name `My Task`.

```shell script
lab-bootstrap begin mytask "My Task"
```

#### Stopping a Task

```shell script
lab-bootstrap end mytask
```

#### Updating a Task's State

```shell script
lab-bootstrap update mytask "new-state"
```

#### Deleting a Task

```shell script
lab-bootstrap del mytask
```

#### Listing All Running Task IDs

```shell script
lab-bootstrap list
```






