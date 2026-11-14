Pod::Spec.new do |s|
  s.name = 'StaarWatch'
  s.version = '1.0.0'
  s.summary = 'STAAR Hub WatchConnectivity bridge'
  s.description = 'Device status and explicit companion handshakes, without account credentials.'
  s.author = 'STAARWARDD'
  s.homepage = 'https://github.com/kingstvieee/cross-life-ai'
  s.license = { :type => 'MIT' }
  s.platform = :ios, '16.0'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.frameworks = 'WatchConnectivity'
end
