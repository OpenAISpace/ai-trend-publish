export class VectorSimilarityUtil {
  /**
   * 计算余弦相似度
   * @param vec1 向量1
   * @param vec2 向量2
   * @returns 相似度(0-1之间)
   */
  static cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配');
    }

    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const norm1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  /**
   * 计算欧氏距离
   * @param vec1 向量1
   * @param vec2 向量2
   * @returns 距离(值越小表示越相似)
   */
  static euclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配');
    }

    const sum = vec1.reduce((acc, val, i) => {
      const diff = val - vec2[i];
      return acc + diff * diff;
    }, 0);

    return Math.sqrt(sum);
  }

  /**
   * 将欧氏距离转换为相似度分数
   * @param distance 欧氏距离
   * @returns 相似度(0-1之间)
   */
  static distanceToSimilarity(distance: number): number {
    return 1 / (1 + distance);
  }
} 
