# V-Blogger

V-Blogger is a small project I made for fun. It has a basic interface, and supports anonymous posting (limited). It currently only supports text posts, but this will change in the near future (if I remember).

## Features

- Simple and intuitive user interface
- Automatic name signing with "anonymous" for non-account-holders
- Responsive design for all devices
- Hashed password storage
- User authentication with front-end pre-hashing
- Private user messages (DMs)
- Markdown support for posts
- Likes and Comments for posts
- MongoDB for data persistance

## Getting Started

You can visit a live demo [here](https://v-blogger.onrender.com/) (loading time is ~50sec), or you can run it on your own machine.

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
git clone https://github.com/Visheshbons/v-blogger.git
cd v-blogger
npm install
```

### Running the App

```bash
npm start
```

The app will be available at `localhost:3000`, or the port specified in `.env` (if detected)

## Usage

1. Register for an account or log in.
2. Create and publish text-only blog posts.
3. Send DMs to any other user
4. Markdown syntax is supported for posts
5. Likes and Comments for posts

## Coming soon...

1. Account modification
2. Account deletion
3. Post editing and deletion
4. Argon2 Hashing

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue on GitHub.

<hr>

<small>Up to date as of `v2.1.0`</small>
