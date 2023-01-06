export type GitRepo = {
  owner: string,
  repoName: string,
  branch: string,
  tokenName: string,
}

export const INFRA_GIT_REPO:GitRepo = { 
  owner: 'revino',
  repoName: 'prjoectM-cdk', 
  branch: 'master',
  tokenName: 'github-token',
};

export const MAIN_GIT_REPO:GitRepo  = { 
  owner: 'revino',
  repoName: 'prjoectM', 
  branch: 'master',
  tokenName: 'github-token',
};
