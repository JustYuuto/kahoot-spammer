# Kahoot! Spammer

A simple script to flood a Kahoot! game with bots.

> [!IMPORTANT]
> This project is for educational purposes only. I am not responsible for any misuse of this project.

## Installation

1. Clone the repository
2. Install the required packages
  ```bash
  npm install
  # or if you use bun
  bun install
  ```
3. Replace the `code` variable in the `index.ts` file with the game code
  ```javascript
  const code = '1234567';
  ```
4. Run the script
  ```bash
  ts-node index.ts
  # or if you use bun
  bun run index.ts
  ```
5. Enjoy!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.