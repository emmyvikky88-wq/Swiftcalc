
const resultDisplay = document.getElementById("result");
const expressionDisplay = document.getElementById("expression");
const historyDisplay = document.getElementById("history");

const keypad = document.querySelector(".keypad");

let expression = "";
let answer = 0;
let justCalculated = false;

// Display the current expression
function updateDisplay() {
  expressionDisplay.textContent = expression;
}

// Tokenize the mathematical expression
function tokenize(input) {
  const tokens = [];
  const pattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([a-zA-Z]+)|(.) )/y;
  let position = 0;

  while (position < input.length) {
    if (/\s/.test(input[position])) {
      position++;
      continue;
    }

    const remaining = input.slice(position);

    const number = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      position += number[0].length;
      continue;
    }

    const word = remaining.match(/^[a-zA-Z]+/);
    if (word) {
      tokens.push({ type: "word", value: word[0].toLowerCase() });
      position += word[0].length;
      continue;
    }

    const char = input[position];

    if ("+-−×÷*/^!%()".includes(char)) {
      tokens.push({ type: "symbol", value: char });
      position++;
      continue;
    }

    throw new Error("Invalid character");
  }

  return tokens;
}

// Scientific calculation engine
function calculate(input) {
  const tokens = tokenize(input);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function take() {
    return tokens[index++];
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0 || n > 170) {
      throw new Error("Invalid factorial");
    }

    let value = 1;
    for (let i = 2; i <= n; i++) {
      value *= i;
    }
    return value;
  }

  const functions = {
    sin: x => Math.sin(x * Math.PI / 180),
    cos: x => Math.cos(x * Math.PI / 180),
    tan: x => Math.tan(x * Math.PI / 180),
    log: x => Math.log10(x),
    ln: x => Math.log(x),
    sqrt: x => Math.sqrt(x),
    abs: x => Math.abs(x)
  };

  function parseExpression(minPrecedence = 0) {
    let token = take();
    if (!token) throw new Error("Incomplete expression");

    let left;

    if (token.type === "number") {
      left = token.value;
    } else if (token.value === "(") {
      left = parseExpression();
      if (!peek() || take().value !== ")") {
        throw new Error("Missing closing bracket");
      }
    } else if (token.value === "+" || token.value === "−" || token.value === "-") {
      left = parseExpression(25);
      if (token.value !== "+") left = -left;
    } else if (token.type === "word") {
      const name = token.value;

      if (name === "pi") {
        left = Math.PI;
      } else if (name === "e") {
        left = Math.E;
      } else if (name === "ans") {
        left = answer;
      } else if (functions[name]) {
        if (!peek() || take().value !== "(") {
          throw new Error("Function needs parentheses");
        }
        const argument = parseExpression();
        if (!peek() || take().value !== ")") {
          throw new Error("Missing closing bracket");
        }
        left = functions[name](argument);
      } else {
        throw new Error("Unknown function");
      }
    } else {
      throw new Error("Invalid expression");
    }

    while (peek()) {
      const next = peek();

      // Factorial and percentage
      if (next.value === "!" || next.value === "%") {
        if (40 < minPrecedence) break;
        take();
        left = next.value === "!" ? factorial(left) : left / 100;
        continue;
      }

      if (next.value === ")") break;

      let operator = next.value;
      let precedence;

      if (["+", "-", "−"].includes(operator)) {
        precedence = 10;
      } else if (["*", "×", "÷", "/"].includes(operator)) {
        precedence = 20;
      } else if (operator === "^") {
        precedence = 30;
      } else {
        break;
      }

      if (precedence < minPrecedence) break;

      take();
      const right = parseExpression(
        operator === "^" ? precedence : precedence + 1
      );

      switch (operator) {
        case "+": left += right; break;
        case "-":
        case "−": left -= right; break;
        case "*":
        case "×": left *= right; break;
        case "/":
        case "÷":
          if (right === 0) throw new Error("Cannot divide by zero");
          left /= right;
          break;
        case "^": left = Math.pow(left, right); break;
      }
    }

    return left;
  }

  if (!tokens.length) throw new Error("Enter a calculation");

  const value = parseExpression();

  if (index !== tokens.length) {
    throw new Error("Invalid expression");
  }

  if (!Number.isFinite(value)) {
    throw new Error("Math error");
  }

  return value;
}

// Format the answer
function formatResult(value) {
  return Number.parseFloat(value.toPrecision(12)).toString();
}

// Calculate button
function calculateResult() {
  if (!expression) return;

  try {
    const oldExpression = expression;
    const value = calculate(expression);

    answer = value;
    resultDisplay.textContent = formatResult(value);
    historyDisplay.textContent = oldExpression + " =";
    expression = formatResult(value);
    justCalculated = true;

    updateDisplay();
  } catch (error) {
    resultDisplay.textContent = "Error";
    historyDisplay.textContent = error.message;
  }
}

// Handle keypad buttons
keypad.addEventListener("click", function(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "clear") {
    expression = "";
    resultDisplay.textContent = "0";
    historyDisplay.textContent = "Ready to calculate";
    justCalculated = false;
    updateDisplay();
    return;
  }

  if (action === "delete") {
    expression = expression.slice(0, -1);
    justCalculated = false;
    updateDisplay();
    return;
  }

  if (action === "calculate") {
    calculateResult();
    return;
  }

  if (!value) return;

  let input = value === "percent" ? "%" : value;

  const isOperator = ["+", "−", "×", "÷", "^", "%", "!"].includes(input);

  if (justCalculated && !isOperator) {
    expression = "";
  }

  if (justCalculated && isOperator) {
    expression = formatResult(answer);
  }

  expression += input;
  justCalculated = false;

  updateDisplay();
});

// Keyboard support
document.addEventListener("keydown", function(event) {
  const key = event.key;

  if (/^[0-9.]$/.test(key)) {
    expression += key;
  } else if (["+", "-", "*", "/", "^", "(", ")", "!"].includes(key)) {
    expression += key;
  } else if (key === "Enter" || key === "=") {
    calculateResult();
  } else if (key === "Backspace") {
    expression = expression.slice(0, -1);
  } else if (key === "Escape") {
    expression = "";
    resultDisplay.textContent = "0";
    historyDisplay.textContent = "Ready to calculate";
  } else {
    return;
  }

  justCalculated = false;
  updateDisplay();
});

console.log("SwiftCalc calculation engine loaded!");
