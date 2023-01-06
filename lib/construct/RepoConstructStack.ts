
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { Construct } from 'constructs';
import { GitRepo } from '../../config/repositoryConfig';

export type RepoConstructProps = {
  ecrName: string,
  gitRepo: GitRepo,
  stackProps?: StackProps,
  ecrLoad: boolean,
} 

export class RepoConstructStack extends Stack{
  public gitRepo: GitRepo;
  public ecrRepo: ecr.IRepository;

  constructor(scope: Construct, id: string, props: RepoConstructProps){
    super(scope, id, props.stackProps);

    this.gitRepo = props.gitRepo;

    if(props.ecrLoad){
      this.ecrRepo = ecr.Repository.fromRepositoryName(this, `ecr-repo`, props.ecrName);
    }
    else{
      this.ecrRepo = new ecr.Repository(this, 'ecr-repo', {
        repositoryName: props.ecrName,
        removalPolicy: RemovalPolicy.DESTROY,
      }); 
    }

    
  }
}