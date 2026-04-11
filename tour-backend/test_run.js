try {
    require('./dist/main.js');
} catch (e) {
    console.error("ERROR CAUGHT:");
    console.error(e.message);
    process.exit(1);
}
