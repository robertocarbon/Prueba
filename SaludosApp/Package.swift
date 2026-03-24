// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SaludosApp",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "SaludosApp", targets: ["SaludosApp"]),
    ],
    targets: [
        .target(name: "SaludosApp"),
    ]
)
