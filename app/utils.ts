export const createTrainNumMap = (res) =>
  Object.values(res)
    .flat()
    .reduce(
      (acc, { routeName, trainNum }) => ({
        ...acc,
        [routeName]: acc.hasOwnProperty(routeName)
          ? acc[routeName].add(trainNum)
          : (acc[routeName] = new Set([trainNum])),
      }),
      {},
    );

export const createStationCodeMetadataMap = (res) =>
  Object.values(res)
    .flat()
    .reduce(
      (acc, { code, name, tz }) => ({
        ...acc,
        [code]: {
          code,
          name,
          tz,
        },
      }),
      {},
    );
