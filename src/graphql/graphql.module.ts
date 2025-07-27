import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req, res }) => {
        console.log('📦 Incoming GraphQL request:');
        console.log('➡️ method:', req.method);
        console.log('➡️ path:', req.url);
        console.log('➡️ body:', req.body);
        console.log('➡️ headers:', req.headers);
        return { req, res };
      },
    }),
  ],
})
export class GraphqlModule {}
