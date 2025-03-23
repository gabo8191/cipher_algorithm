const PORT = process.env.PORT || 3000;

const startServer = (app) => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};

module.exports = {
  startServer,
};
