class LCGGenerator {
  static calculateXi(xi, a, c, m) {
    return (a * xi + c) % m;
  }

  static calculateRi(xi, m) {
    return xi / (m - 1);
  }

  static calculateNi(minValue, maxValue, ri) {
    return minValue + (maxValue - minValue) * ri;
  }

  static calculateTable(x0, a, c, m, iterations, minValue, maxValue) {
    const table = [];
    let xi = x0;
    const niArray = [];

    for (let i = 0; i < iterations; i++) {
      xi = this.calculateXi(xi, a, c, m);
      const ri = this.calculateRi(xi, m);
      const ni = this.calculateNi(minValue, maxValue, ri);
      niArray.push(ni);
      table.push([i + 1, xi, ri, ni]);
    }

    return { table, niArray };
  }
}

module.exports = LCGGenerator;
