FROM ruby:3.3.8-slim-bookworm

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential libpq-dev libyaml-dev curl ca-certificates postgresql-client libjemalloc2 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /rails

ARG BUNDLE_WITHOUT_GROUPS=development:test
ENV RAILS_ENV=production \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=${BUNDLE_WITHOUT_GROUPS} \
    LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2 \
    MALLOC_CONF=background_thread:true,metadata_thp:auto,dirty_decay_ms:5000,muzzy_decay_ms:5000

COPY Gemfile Gemfile.lock .ruby-version ./
RUN bundle install && rm -rf .bundle

COPY . .

RUN bundle exec bootsnap precompile --gemfile app/ lib/
RUN rm -rf tmp/cache spec/ test/

EXPOSE 3000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bundle", "exec", "puma"]
