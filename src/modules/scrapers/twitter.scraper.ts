import {
  ContentScraper,
  Media,
  ScrapedContent,
  ScraperOptions,
} from "@src/modules/interfaces/scraper.interface.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { formatDate } from "@src/utils/common.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("twitter-scraper");

export class TwitterScraper implements ContentScraper {
  private xApiBearerToken: string | undefined;

  constructor() {
  }

  async refresh(): Promise<void> {
    const startTime = Date.now();
    this.xApiBearerToken = await ConfigManager.getInstance().get(
      "X_API_BEARER_TOKEN",
    );
    logger.debug(
      `TwitterScraper 初始化完�? 耗时: ${Date.now() - startTime}ms`,
    );
  }

  async scrape(
    sourceId: string,
    options?: ScraperOptions,
  ): Promise<ScrapedContent[]> {
    await this.refresh();
    const usernameMatch = sourceId.match(/x\.com\/([^\/]+)/);
    if (!usernameMatch) {
      throw new Error("Invalid Twitter source ID format");
    }

    const username = usernameMatch[1];
    logger.debug(`Processing Twitter user: ${username}`);

    try {
      const query = `from:${username} -filter:replies within_time:24h`;
      const apiUrl =
        `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${
          encodeURIComponent(
            query,
          )
        }&queryType=Top`;

      const response = await fetch(apiUrl, {
        headers: {
          "X-API-Key": `${this.xApiBearerToken}`,
        },
      });

      if (!response.ok) {
        const errorMsg = `Failed to fetch tweets: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const tweets = await response.json();
      const scrapedContent: ScrapedContent[] = tweets.tweets
        .slice(0, 20)
        .map((tweet: any) => {
          const quotedContent = this.getQuotedContent(tweet.quoted_tweet);
          let media = this.getMediaList(tweet.extendedEntities);
          // 合并tweet和quotedContent 如果quotedContent存在，则将quotedContent的内容添加到tweet的内容中
          const content = quotedContent
            ? `${tweet.text}\n\n 【QuotedContent:${quotedContent.content}】`
            : tweet.text;
          // 合并media和quotedContent的media
          if (quotedContent?.media) {
            media = [...media, ...quotedContent.media];
          }
          return {
            id: tweet.id,
            title: tweet.text.split("\n")[0],
            content: content,
            url: tweet.url,
            publishDate: formatDate(tweet.createdAt),
            media: media,
            metadata: {
              platform: "twitter",
              username,
            },
          } as ScrapedContent;
        });

      if (scrapedContent.length > 0) {
        logger.debug(
          `Successfully fetched ${scrapedContent.length} tweets from ${username}`,
        );
      } else {
        logger.debug(`No tweets found for ${username}`);
      }

      logger.debug("scrapedContent", JSON.stringify(scrapedContent, null, 2));

      return scrapedContent;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Error fetching tweets for ${username}:`, errorMsg);
      throw error;
    }
  }

  private getMediaList(extendedEntities: any): Media[] {
    const mediaList: Media[] = [];
    if (extendedEntities && extendedEntities.media) {
      extendedEntities.media.forEach((media: any) => {
        mediaList.push({
          url: media.media_url_https,
          type: media.type,
          size: {
            width: media.sizes.large.w,
            height: media.sizes.large.h,
          },
        });
      });
    }
    return mediaList;
  }

  private getQuotedContent(quoted_tweet: any): ScrapedContent | null {
    if (quoted_tweet) {
      return {
        id: quoted_tweet.id,
        title: quoted_tweet.text.split("\n")[0],
        content: quoted_tweet.text,
        url: quoted_tweet.url,
        publishDate: formatDate(quoted_tweet.createdAt),
        media: this.getMediaList(quoted_tweet.extendedEntities),
        metadata: {
          platform: "twitter",
        },
      };
    }
    return null;
  }
}
