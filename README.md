# Record IT API

## Steps Array Options
=====================================

The `steps` array is a flexible data structure that can be used to define a series of tasks or actions to be executed in a specific order. The following options can be passed in a `steps` array:

### Step Types

* **Function**: A JavaScript function that will be executed at runtime.
* **Object**: An object with a `run` method that will be executed at runtime.
* **String**: A string that will be used as a command to be executed at runtime.

### Step Properties

* **`name`**: A string that describes the step.
* **`description`**: A string that provides additional information about the step.
* **`timeout`**: A number that specifies the maximum amount of time (in milliseconds) that the step can take to complete.
* **`retry`**: A boolean that indicates whether the step should be retried if it fails.
* **`retryCount`**: A number that specifies the maximum number of times the step should be retried.
* **`retryDelay`**: A number that specifies the amount of time (in milliseconds) to wait before retrying the step.

### Step Examples

#### Function Step
```javascript
{
  name: 'My Step',
  run: () => {
    console.log('Hello World!');
  }
}
```

#### Object Step
```javascript
{
  name: 'My Step',
  run: function() {
    console.log('Hello World!');
  }
}
```

#### String Step
```javascript
{
  name: 'My Step',
  run: 'echo "Hello World!"'
}
```

### Additional Options

* **`dependsOn`**: An array of step names that this step depends on.
* **`dependsOnAll`**: A boolean that indicates whether this step depends on all previous steps.
* **`ignoreErrors`**: A boolean that indicates whether errors in this step should be ignored.

Note that not all options are required, and the specific options that are available may depend on the context in which the `steps` array is being used.

## Example

curl -X POST http://localhost:8787/record \
  -H 'content-type: application/json' \
  -d '{
    "options": { "url": "https://demoto.xyz", "restrictHost": "example.com" },
    "steps": [
      { "action": "waitForSelector", "selector": "text=Demoto.xyz" },
      { "action": "click", "selector": "text=Demoto.xyz" },
      { "action": "wait", "ms": 1000 }
    ]
  }'