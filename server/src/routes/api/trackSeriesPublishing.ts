type TrackSeriesPublishInput = {
  previousIsPublished: boolean;
  nextIsPublished: boolean | undefined;
};

export function shouldPublishTrackSeries(input: TrackSeriesPublishInput): boolean {
  return input.nextIsPublished === true && !input.previousIsPublished;
}
